from flask import Blueprint, jsonify
import os
from b2sdk.v2 import InMemoryAccountInfo, B2Api

b2_bp = Blueprint('b2_files', __name__)

# B2 Setup
info = InMemoryAccountInfo()
b2_api = B2Api(info)
B2_KEY_ID = os.environ.get('BACKBLAZE_KEY_ID')
B2_APP_KEY = os.environ.get('BACKBLAZE_APPLICATION_KEY')
B2_BUCKET_NAME = 'remotion-videos'

b2_bucket = None

if B2_KEY_ID and B2_APP_KEY:
    # Initialize B2 connection if credentials exist
    try:
        b2_api.authorize_account("production", B2_KEY_ID, B2_APP_KEY)
        b2_bucket = b2_api.get_bucket_by_name(B2_BUCKET_NAME)
    except Exception as e:
        print(f"Warning: Could not initialize B2 bucket: {str(e)}")

@b2_bp.route('/files', methods=['GET'])
def get_b2_files():
    if not b2_bucket:
        return jsonify({"error": "B2 bucket not configured"}), 500
    
    try:
        # List all files in the bucket
        files = []
        
        for file_info, folder_name in b2_bucket.ls(recursive=True):
            files.append({
                'fileId': file_info.id_,
                'fileName': file_info.file_name,
                'size': file_info.size,
                'uploadTimestamp': file_info.upload_timestamp,
                'downloadUrl': b2_bucket.get_download_url(file_info.file_name)
            })
        
        return jsonify(files)
    except Exception as e:
        return jsonify({"error": str(e)}), 500 