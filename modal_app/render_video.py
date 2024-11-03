import modal

remotion_image = (
  modal.Image.from_registry("ghcr.io/calebcauthon/goalty-remotion:docker", add_python="3.11")
  .pip_install("requests")
)

import requests
import hashlib
import os

app = modal.App()

@app.function(image=remotion_image, timeout=60 * 20, gpu='any', secrets=[modal.Secret.from_name("backblaze-keys")])
def render_video():
    import subprocess

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

    def download_file(auth_data): 
      
      download_url = auth_data['downloadUrl']
      auth_token = auth_data['authorizationToken']
      
      # Download the file
      bucket_name = "remotion-videos"
      file_name = "SilKCy Johnsons vs Mephis Mafia__3-23-2024.mp4"
      file_url = f"{download_url}/file/{bucket_name}/{file_name}"
      
      headers = {
          "Authorization": auth_token
      }
      
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

      return {
         "download_path": download_path,
         "file_name": file_name
      }
    
    def render_video(auth_data, download_path, file_name):
      props = '{"selectedVideos":[3,6],"videos":[{"filepath":"downloads/SilKCy Johnsons vs Mephis Mafia__3-23-2024.mp4","id":3,"name":"SilKCy Johnsons vs Mephis Mafia__3-23-2024","metadata":{"height":1020,"width":1980,"youtube_url":"https://www.youtube.com/watch?v=pfbl8JwF2x4"}},{"filepath":"downloads/Silkcy Johnson vs Madison Hoopers__3-23-2024.mp4","id":6,"name":"Silkcy Johnson vs Madison Hoopers__3-23-2024","metadata":{"height":1020,"width":1980,"youtube_url":"https://www.youtube.com/watch?v=ZEp2LESpFbk"}}],"selectedTags":[{"endFrame":3017,"key":"3-home_scoring_possession-undefined-2662-3017","startFrame":2662,"tagName":"home_scoring_possession","videoFilepath":"downloads/SilKCy Johnsons vs Mephis Mafia__3-23-2024.mp4","videoId":3,"videoName":"SilKCy Johnsons vs Mephis Mafia__3-23-2024"}],"useStaticFile":true}'
      
      # Render the video 
      file_size = os.path.getsize(download_path)
      print(f"Downloaded file: {file_name}")
      print(f"File size: {file_size / (1024*1024):.2f} MB")
      print(f"File path: {os.path.abspath(download_path)}")
      output_file_name = "KC_vs_Mafia_-_Scores__2024-11-02_22-20-48.mp4"
      # Write .env file

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
      with open("out/VideoFirstFiveSeconds.mp4", 'rb') as file:
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
    result = download_file(auth_data)
    render_video(auth_data, result["download_path"], result["file_name"])
    upload_video(auth_data, "modal_render_test.mp4")
