import os
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

SCOPES = ['https://www.googleapis.com/auth/youtube.upload']

def get_authenticated_service():
    credentials = None
    # Token file stores the user's credentials from previously successful logins
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            credentials = pickle.load(token)
    
    # If there are no valid credentials available, prompt the user to log in
    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'client_secrets.json', SCOPES)
            credentials = flow.run_local_server(port=8080)
        
        # Save the credentials for the next run
        with open('token.pickle', 'wb') as token:
            pickle.dump(credentials, token)
    
    return build('youtube', 'v3', credentials=credentials)

def upload_video(file_path, title, description='', privacy_status='private'):
    youtube = get_authenticated_service()
    
    body = {
        'snippet': {
            'title': title,
            'description': description,
            'categoryId': '22'  # Category: People & Blogs
        },
        'status': {
            'privacyStatus': privacy_status,
            'selfDeclaredMadeForKids': False,
        }
    }

    insert_request = youtube.videos().insert(
        part=','.join(body.keys()),
        body=body,
        media_body=MediaFileUpload(
            file_path, 
            chunksize=-1, 
            resumable=True
        )
    )

    response = None
    while response is None:
        try:
            _, response = insert_request.next_chunk()
            if response:
                print(f'Video uploaded successfully! Video ID: {response["id"]}')
                return response['id']
        except HttpError as e:
            print(f'An HTTP error {e.resp.status} occurred: {e.content}')
            return None

if __name__ == '__main__':
    video_path = input('Enter the path to your video file: ')
    video_title = input('Enter the video title: ')
    video_description = input('Enter video description (optional): ')
    privacy = input('Enter privacy status (private/unlisted/public) [default: private]: ') or 'private'
    
    if not os.path.exists(video_path):
        print('Error: Video file not found!')
        exit(1)
        
    video_id = upload_video(video_path, video_title, video_description, privacy)
    if video_id:
        print(f'Video URL: https://www.youtube.com/watch?v={video_id}')

