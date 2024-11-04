from b2sdk.v2 import *
import os

info = InMemoryAccountInfo()
b2_api = B2Api(info)

# Add your B2 credentials - you'll want to move these to environment variables
B2_KEY_ID = os.getenv('B2_KEY_ID')
B2_APPLICATION_KEY = os.getenv('B2_APP_KEY')
B2_BUCKET_NAME = 'remotion-videos'

# Initialize B2 connection
b2_api.authorize_account("production", B2_KEY_ID, B2_APPLICATION_KEY)
bucket = b2_api.get_bucket_by_name(B2_BUCKET_NAME)


def check_file_exists_in_b2(filename):
    try:
        # Get file info directly using file name
        file_version = bucket.get_file_info_by_name(filename)
        
        # If we get here, file exists - construct response
        file_info = {
            'download_url': f"https://f004.backblazeb2.com/file/{B2_BUCKET_NAME}/{filename}",
            'upload_timestamp': file_version.upload_timestamp,
            'file_id': file_version.id_,
            'size': file_version.size
        }
        return True, file_info
        
    except FileNotFoundError:
        return False, None
    except Exception as e:
        print(f"Error checking B2 file: {str(e)}")
        return False, None
