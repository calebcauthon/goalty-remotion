from flask import Blueprint, request, jsonify
import yt_dlp
import os
from database import add_video
from werkzeug.utils import secure_filename
from b2 import check_file_exists_in_b2
from b2sdk.v2 import B2Api, InMemoryAccountInfo

upload_bp = Blueprint('upload', __name__)

DOWNLOAD_DIRECTORY = 'downloads'

if not os.path.exists(DOWNLOAD_DIRECTORY):
    os.makedirs(DOWNLOAD_DIRECTORY)

ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'mkv'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
 
@upload_bp.route('/videos/manual', methods=['POST'])
def manual_video_entry():
    data = request.json
    
    if not all(k in data for k in ['title', 'size', 'filepath']):
        return jsonify({'error': 'Missing required fields'}), 400

    # Add to database without B2 upload
    video_id = add_video(
        title=data['title'],
        size=data['size'],
        filepath=data['filepath'],
        metadata=data.get('metadata', {'source': 'manual_entry'})
    )

    return jsonify({
        'message': 'Video added manually',
        'video_id': video_id
    }), 200

@upload_bp.route('/extract-youtube', methods=['GET'])
def extract_youtube_info():
    url = request.args.get('url')
    if not url:
        return jsonify({'error': 'No URL provided'}), 400

    try:
        ydl_opts = {
            'format': 'best',  # We don't actually download, just get info
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            # Get format with max width
            formats = info.get('formats', [])
            max_width_format = max(formats, key=lambda f: f.get('width', 0) if f.get('width') is not None else 0)
            info['formats'] = [max_width_format] if max_width_format else []
            info['thumbnails'] = []
            info['width'] = max_width_format.get('width')
            info['height'] = max_width_format.get('height')

            # Extract relevant fields for our metadata
            return jsonify({
                'title': info.get('title'),
                'size': info.get('filesize') or 0,  # Some videos may not have size info
                'metadata': {
                    'youtube_url': url,
                    'extracted_yt_info': info,
                    'height': info.get('height'),
                    'width': info.get('width'),
                    'tags': []  # Initialize empty tags array
                }
            }), 200
            
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    
@upload_bp.route('/check-render/<filename>', methods=['GET'])
def check_render_status(filename):
    try:
        # Check if file exists in B2 and get its URL
        exists, file_info = check_file_exists_in_b2(filename)
        
        if exists:
            return jsonify({
                'status': 'completed',
                'filename': filename,
                'b2_url': file_info['download_url'],
                'timestamp': file_info['upload_timestamp'],
                'file_id': file_info['file_id'],
                'size': file_info['size']
            })
        
        return jsonify({
            'status': 'rendering',
            'filename': filename
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    
@upload_bp.route('/check-b2-files', methods=['POST'])
def check_b2_files():
    try:
        data = request.json
        filenames = data.get('filenames', [])
        
        if not filenames:
            return jsonify({'error': 'No filenames provided'}), 400
            
        results = []
        for filename in filenames:
            exists, file_info = check_file_exists_in_b2(filename)
            if exists:
                results.append({
                    'filename': filename,
                    'status': 'completed',
                    'b2_url': file_info['download_url'],
                    'timestamp': file_info['upload_timestamp'],
                    'file_id': file_info['file_id'],
                    'size': file_info['size']
                })
            
        return jsonify({
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    
@upload_bp.route('/list-b2-videos', methods=['GET'])
def list_b2_videos():
    info = InMemoryAccountInfo()
    b2_api = B2Api(info)
    b2_api.authorize_account("production", os.getenv('BACKBLAZE_KEY_ID'), os.getenv('BACKBLAZE_APPLICATION_KEY'))
    
    bucket = b2_api.get_bucket_by_name("remotion-videos")
    
    # List all files in the bucket
    files = []

    for file_version, folder_name in bucket.ls():
        file_name = file_version.file_name
        if file_name.lower().endswith('.mp4'):
            files.append({
                'name': file_name,
                'id': file_version.id_,
                'size': file_version.size,
                'uploadTimestamp': file_version.upload_timestamp,
                'url': f"https://f005.backblazeb2.com/file/remotion-videos/{file_name}"
            })
    
    return jsonify({'files': files}), 200
