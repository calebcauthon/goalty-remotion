import modal

remotion_image = (
  modal.Image.from_registry("ghcr.io/calebcauthon/goalty-remotion:master", add_python="3.11")
  .pip_install("requests", "fastapi[standard]", "b2sdk")
)

import requests
import hashlib
import os
from pydantic import BaseModel
import copy

app = modal.App("remotion-goalty-render-video")

class RenderVideoRequest(BaseModel):
    videos: list[str]
    props: dict
    output_file_name: str

@app.function(
    image=remotion_image, 
    timeout=60 * 60, 
    secrets=[modal.Secret.from_name("backblaze-keys")]
)
def render_video(render_params: RenderVideoRequest):
    import subprocess
    import json

    def authenticate_backblaze():
      auth_url = "https://api.backblazeb2.com/b2api/v2/b2_authorize_account"
      account_id = os.environ["BACKBLAZE_KEY_ID"]
      application_key = os.environ["BACKBLAZE_APPLICATION_KEY"]
      if not account_id or not application_key:
          raise Exception("BACKBLAZE_KEY_ID and BACKBLAZE_APPLICATION_KEY environment variables must be set")
      else:
          print(f"First 5 characters of BACKBLAZE_KEY_ID: {account_id[:5]} and BACKBLAZE_APPLICATION_KEY: {application_key[:5]}")

      response = requests.get(auth_url, auth=(account_id, application_key))
      response.raise_for_status()
      auth_data = response.json()

      return auth_data

    def download_videos(auth_data): 
      download_url = auth_data['downloadUrl']
      auth_token = auth_data['authorizationToken']
      
      # Download the file
      bucket_name = "remotion-videos"
      for video in render_params.videos:
        file_name = video
        file_url = f"{download_url}/file/{bucket_name}/{file_name}"
        
        headers = {
          "Authorization": auth_token
        }
      
        print(f"Downloading file: {file_url}...")
        file_response = requests.get(file_url, headers=headers)
        file_response.raise_for_status()
        
        # Save the file locally
        # Create downloads directory if it doesn't exist
        download_dir = "/public"
        os.makedirs(download_dir, exist_ok=True)
        
        # Save file to downloads directory
        download_path = os.path.join(download_dir, file_name)
        with open(download_path, 'wb') as file:
            file.write(file_response.content)


        file_size = os.path.getsize(download_path)
        print(f"Downloaded file: {file_name}")
        print(f"File size: {file_size / (1024*1024):.2f} MB")
        print(f"File path: {os.path.abspath(download_path)}")

      return
    
    def render_mp4(props, output_file_name):
      # Write output filename to a temporary file
      with open('/tmp/filename.txt', 'w') as f:
          print(f"Writing output filename to /tmp/filename.txt: {output_file_name}")
          f.write(output_file_name)

      # Write props to a temporary file
      with open('/tmp/props.json', 'w') as f:
          print(f"Writing props to /tmp/props.json: {props}")
          json.dump(props, f)

      # Write range to a temporary file
      with open('/tmp/range.txt', 'w') as f:
          print(f"Writing range to /tmp/range.txt: {props.get('range', '')}")
          f.write(str(props.get('range', '')))

      subprocess.run([
          "node", "/render.mjs"
      ],
      check=True)

    def upload_video(auth_data, output_file_name):
      # Get upload URL
      auth_token = auth_data['authorizationToken']
      upload_url_response = requests.post(
          f"{auth_data['apiUrl']}/b2api/v2/b2_get_upload_url",
          headers={"Authorization": auth_token},
          json={"bucketId": auth_data['allowed']['bucketId']}
      )
      upload_url_response.raise_for_status()
      upload_data = upload_url_response.json()
      
      # Upload the rendered video
      with open(f"out/{output_file_name}", 'rb') as file:
          file_data = file.read()
          sha1_of_file_data = hashlib.sha1(file_data).hexdigest()
          
          upload_headers = {
              "Authorization": upload_data['authorizationToken'],
              "X-Bz-File-Name": output_file_name,
              "Content-Type": "b2/x-auto",
              "Content-Length": str(len(file_data)),
              "X-Bz-Content-Sha1": sha1_of_file_data
          }
          
          upload_response = requests.post(
              upload_data['uploadUrl'],
              headers=upload_headers,
              data=file_data
          )
          upload_response.raise_for_status()
          print(f"Uploaded file: {output_file_name} to B2 bucket")

    auth_data = authenticate_backblaze()
    download_videos(auth_data)
    render_mp4(render_params.props, render_params.output_file_name)
    upload_video(auth_data, render_params.output_file_name)


@app.function(
    image=remotion_image, 
    timeout=60 * 60, 
    secrets=[modal.Secret.from_name("backblaze-keys")]
)
@modal.web_endpoint(method="POST")
def split_render_request(render_params: RenderVideoRequest):
    # Extract frame range from selected tags
    start_frame = render_params.props['selectedTags'][0]['startFrame'] 
    end_frame = render_params.props['selectedTags'][0]['endFrame']
    total_frames = end_frame - start_frame

    # Split into chunks of 500 frames
    chunk_size = 250
    chunks = []

    # Calculate chunk ranges
    chunk_ranges = []
    prev_chunk_end = 0
    for i in range(0, total_frames, chunk_size):
        chunk_start = prev_chunk_end + 1
        chunk_end = min(i + chunk_size, total_frames)
        chunk_ranges.append((chunk_start - 1, chunk_end - 1))
        prev_chunk_end = chunk_end


    print(f"Chunk ranges: {chunk_ranges}")

    pollables = []
    for chunk_start, chunk_end in chunk_ranges:
        chunk_request = copy.deepcopy(render_params)
        chunk_request.props['range'] = [chunk_start, chunk_end]
        
        # Generate unique output filename for this chunk
        base_name = render_params.output_file_name.replace('.mp4', '')
        chunk_name = f"{base_name}_chunk_{chunk_start}_{chunk_end}.mp4"
        chunks.append((chunk_request, chunk_name))

        chunk_request.output_file_name = chunk_name
        print(f"Processing chunk: {chunk_name}")
        pollable = render_video.spawn(chunk_request)
        pollables.append(pollable)

    for pollable in pollables:
        pollable_result = pollable.get()
        print(f"Pollable result {pollable_result}")

    combine_video_chunks(render_params.output_file_name)

    return {"status": "success", "message": f"Processed {len(chunks)} chunks"}


def combine_video_chunks(base_filename: str):
    import subprocess
    from pathlib import Path

    # Download all chunks matching pattern
    base_name = base_filename.replace('.mp4', '')
    downloads = download_videos({"chunk_pattern": base_name})

    # Create file list for ffmpeg
    with open("./files.txt", "w") as f:
        for chunk in sorted(downloads):
            f.write(f"file '{chunk}'\n")

    # Combine using ffmpeg
    output_path = f"./{base_filename}.mp4"
    subprocess.run([
        "ffmpeg", "-f", "concat", "-safe", "0",
        "-i", "./files.txt",
        "-c", "copy", output_path
    ], check=True)

    auth_data = authenticate_backblaze()
    b2_filename = base_filename
    upload_video(auth_data, output_path, b2_filename)

    return {"status": "success", "message": f"Combined chunks into {b2_filename}"}

def download_videos(params):
    auth_data = authenticate_backblaze()
    download_url = auth_data['downloadUrl']
    auth_token = auth_data['authorizationToken']
    
    # Download the file
    bucket_name = "remotion-videos"
    chunk_pattern = params["chunk_pattern"]
    print(f"Chunk pattern: {chunk_pattern}")
    
    # Get bucket object
    from b2sdk.v2 import B2Api, InMemoryAccountInfo
    info = InMemoryAccountInfo()
    b2_api = B2Api(info)
    b2_api.authorize_account("production", os.environ["BACKBLAZE_KEY_ID"], os.environ["BACKBLAZE_APPLICATION_KEY"])
    bucket = b2_api.get_bucket_by_name("remotion-videos")

    # List files matching pattern
    response = {"files": []}
    for file_version, _ in bucket.ls():
        response["files"].append({
            "fileName": file_version.file_name,
            "fileId": file_version.id_
        })
    
    print(f"Files: {response['files']}")
    matching_files = [f for f in response['files'] if chunk_pattern in f['fileName']]
    print(f"Matching files: {matching_files}")

    downloads = []
    for file in matching_files:
        print(f"Downloading chunk: {file['fileName']}...")
        file_name = file['fileName']

        download_path = os.path.join("./", file_name)
        downloadable = bucket.download_file_by_name(file_name)
        if not os.path.exists(download_path):
            downloadable.save_to(download_path)
        else:
            print(f"File already exists: {download_path}")

        downloads.append(download_path)

        print(f"Downloaded chunk: {file_name}")
        print(f"File size: {os.path.getsize(download_path) / (1024*1024):.2f} MB")

    return downloads

def upload_video(auth_data, local_file_path, output_file_name):
    from b2sdk.v2 import B2Api, InMemoryAccountInfo
    info = InMemoryAccountInfo()
    b2_api = B2Api(info)
    b2_api.authorize_account("production", os.environ["BACKBLAZE_KEY_ID"], os.environ["BACKBLAZE_APPLICATION_KEY"])
    bucket = b2_api.get_bucket_by_name("remotion-videos")
    
    bucket.upload_local_file(local_file_path, output_file_name)
    print(f"Uploaded file: {output_file_name} to B2 bucket")

def authenticate_backblaze():
    auth_url = "https://api.backblazeb2.com/b2api/v2/b2_authorize_account"
    account_id = os.environ["BACKBLAZE_KEY_ID"]
    application_key = os.environ["BACKBLAZE_APPLICATION_KEY"]
    if not account_id or not application_key:
        raise Exception("BACKBLAZE_KEY_ID and BACKBLAZE_APPLICATION_KEY environment variables must be set")
    else:
        print(f"First 5 characters of BACKBLAZE_KEY_ID: {account_id[:5]} and BACKBLAZE_APPLICATION_KEY: {application_key[:5]}")

    response = requests.get(auth_url, auth=(account_id, application_key))
    response.raise_for_status()
    auth_data = response.json()

    return auth_data