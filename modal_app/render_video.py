import modal

remotion_image = (
  modal.Image.from_registry("ghcr.io/calebcauthon/goalty-remotion:master", add_python="3.11")
  .apt_install("ffmpeg")
  .pip_install("requests", "fastapi[standard]", "b2sdk")
)

import requests
import hashlib
import os
from pydantic import BaseModel
import copy
from pathlib import Path
import shutil

app = modal.App("remotion-goalty-render-video")

class RenderVideoRequest(BaseModel):
    videos: list[str]
    props: dict
    output_file_name: str
    chunk_size: int = 500
    composition_name: str = 'VideoFirstFiveSeconds'

# Create a volume for video storage
volume = modal.Volume.from_name("remotion-videos-vol", create_if_missing=True)
VOLUME_PATH = "/public"

@app.function(
    image=remotion_image, 
    timeout=60 * 60, 
    secrets=[modal.Secret.from_name("backblaze-keys")],
    volumes={VOLUME_PATH: volume}
)
def render_video(render_params: RenderVideoRequest):
    import subprocess
    import json
    from b2sdk.v2 import B2Api, InMemoryAccountInfo

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

      # Check if file exists in B2
      bucket = authenticate_bucket("remotion-videos")
      files = list_files_matching_pattern(bucket, output_file_name)

      if files and files[0]['fileName'] == output_file_name:
          print(f"File {output_file_name} already exists in B2, skipping render")
          return True

      print("Running render.mjs..")
      subprocess.run([
          "node", "/render.mjs"
      ],
      check=True)

      return False


    already_exists = render_mp4(render_params.props, render_params.output_file_name)
    upload_video(f"out/{render_params.output_file_name}", render_params.output_file_name) if not already_exists else None

    return render_params.output_file_name


@app.function(
    image=remotion_image, 
    timeout=60 * 60, 
    volumes={VOLUME_PATH: volume},
    secrets=[modal.Secret.from_name("backblaze-keys")]
)
@modal.web_endpoint(method="POST")
def split_render_request(render_params: RenderVideoRequest):
    import time
    
    # Write composition name to a temporary file
    with open('/tmp/composition.txt', 'w') as f:
        composition_name = render_params.composition_name
        print(f"Writing composition name to /tmp/composition.txt: {composition_name}")
        f.write(composition_name)

    # Add this function to download raw videos to the volume
    def download_raw_videos(video_urls: list[str]):
        import requests
        
        downloaded_paths = []
        for i, url in enumerate(video_urls):
            video_path = Path(VOLUME_PATH) / url.split('/')[-1]
            
            if video_path.exists():
                print(f"Video {i} already exists at {video_path}")
                downloaded_paths.append(str(video_path))
                continue
                
            print(f"Downloading video {i} to {video_path}")
            
            # Stream download to avoid memory issues
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            with open(video_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            
            downloaded_paths.append(str(video_path))
            print(f"Successfully downloaded video {i}")
        
        return downloaded_paths

    # Add this call near the start of split_render_request
    downloaded_videos = download_raw_videos([video['filepath'] for video in render_params.props['videos']])
    print(f"Downloaded videos to volume: {downloaded_videos}")

    def calculate_chunk_ranges(render_params, chunk_size):
        total_frames = sum(int(tag['endFrame']) - int(tag['startFrame']) for tag in render_params.props['selectedTags'])

        chunk_ranges = []
        prev_chunk_end = 0
        for i in range(0, total_frames, chunk_size):
            chunk_start = prev_chunk_end + 1
            chunk_end = min(i + chunk_size, total_frames)
            chunk_ranges.append((chunk_start - 1, chunk_end - 1))
            prev_chunk_end = chunk_end

        return chunk_ranges

    def create_chunk_request(original_params, chunk_start, chunk_end):
        chunk_request = copy.deepcopy(original_params)
        chunk_request.props['range'] = [chunk_start, chunk_end]
        
        # Generate unique output filename for this chunk
        base_name = original_params.output_file_name.replace('.mp4', '')
        chunk_name = f"{base_name}_chunk_{chunk_start}_{chunk_end}.mp4"
        chunk_request.output_file_name = chunk_name
        return chunk_request

    def distribute_renders(render_params, chunk_ranges):
        distributed_renders = []
        for chunk_start, chunk_end in chunk_ranges:
            chunk_request = create_chunk_request(render_params, chunk_start, chunk_end)
            
            time.sleep(0.5)  # Wait 500ms
            pollable = render_video.spawn(chunk_request)
            distributed_renders.append(pollable)
        return distributed_renders

    print(f"Calculating chunk ranges with chunk size: {render_params.chunk_size}")
    chunk_ranges = calculate_chunk_ranges(render_params, render_params.chunk_size)
    distributed_renders = distribute_renders(render_params, chunk_ranges)

    # Wait for all chunks to render
    filenames = []
    for this_render in distributed_renders:
        filenames.append(this_render.get())

    combine_video_chunks(render_params.output_file_name, filenames)
    delete_chunks_from_bucket("remotion-videos", f"{render_params.output_file_name.replace('.mp4', '')}_chunk_")

    return {"status": "success", "message": f"Processed {len(distributed_renders)} chunks"}

def combine_video_chunks(base_filename: str, chunked_filenames: list[str]):
    import subprocess

    def combine_with_ffmpeg(output_path):
        # Create file list for ffmpeg
        with open("./files.txt", "w") as f:
            for chunk in downloads:
                f.write(f"file '{chunk}'\n")

        # Combine using ffmpeg
        
        subprocess.run([
            "ffmpeg", "-f", "concat", "-safe", "0",
            "-i", "./files.txt",
            "-c", "copy", output_path
        ], check=True)

        # Delete files.txt after combining
        os.remove("./files.txt")

    downloads = download_videos(chunked_filenames)

    output_path = f"./{base_filename}"
    combine_with_ffmpeg(output_path)

    upload_video(output_path, base_filename)

    return {"status": "success", "message": f"Combined chunks into {base_filename} and uploaded to B2"}

def download_videos(chunked_filenames):  
    def download(file_name, directory):
        print(f"Downloading chunk: {file_name}...")

        download_path = os.path.join(directory, file_name)
        downloadable = bucket.download_file_by_name(file_name)
        if not os.path.exists(download_path):
            downloadable.save_to(download_path)
            print(f"Downloaded chunk: {file_name}")
            print(f"File size: {os.path.getsize(download_path) / (1024*1024):.2f} MB")
        else:
            print(f"File already exists: {download_path}")

        return download_path

    bucket = authenticate_bucket("remotion-videos")
    downloads = []
    for filename in chunked_filenames:
        download_path = download(filename, "./")
        downloads.append(download_path)
        
    return downloads

def upload_video(local_file_path, output_file_name):
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

def authenticate_bucket(bucket_name):
    from b2sdk.v2 import B2Api, InMemoryAccountInfo
    info = InMemoryAccountInfo()
    b2_api = B2Api(info)
    b2_api.authorize_account("production", os.environ["BACKBLAZE_KEY_ID"], os.environ["BACKBLAZE_APPLICATION_KEY"])
    return b2_api.get_bucket_by_name(bucket_name)

def delete_chunks_from_bucket(bucket_name, chunk_pattern):
    bucket = authenticate_bucket(bucket_name)
    files = list_files_matching_pattern(bucket, chunk_pattern)
    for file in files:
        bucket.delete_file_version(file['fileId'], file['fileName'])

def list_files_matching_pattern(bucket, pattern):
    response = {"files": []}
    for file_version, _ in bucket.ls():
        response["files"].append({
            "fileName": file_version.file_name,
            "fileId": file_version.id_
        })
    
    print(f"Files: {response['files']}")
    matching_files = [f for f in response['files'] if pattern in f['fileName']]
    print(f"Matching files: {matching_files}")

    return matching_files