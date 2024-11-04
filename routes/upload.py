from flask import Blueprint, request, jsonify
import yt_dlp
import os
from database import add_video
from b2 import bucket, b2_api
from werkzeug.utils import secure_filename
import mimetypes

upload_bp = Blueprint('upload', __name__)

DOWNLOAD_DIRECTORY = 'downloads'

if not os.path.exists(DOWNLOAD_DIRECTORY):
    os.makedirs(DOWNLOAD_DIRECTORY)

ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'mkv'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def upload_to_b2(local_file_path, b2_file_name):
    uploaded_file = bucket.upload_local_file(
        local_file=local_file_path,
        file_name=b2_file_name,
        file_infos={'type': 'video/mp4'}
    )
    
    download_url = bucket.get_download_url(b2_file_name)
    
    return {
        'file_id': uploaded_file.id_,
        'file_name': uploaded_file.file_name,
        'download_url': download_url,
        'size': uploaded_file.size,
        'upload_timestamp': uploaded_file.upload_timestamp
    }

def download_from_youtube(url):
    """
    Downloads a video from YouTube and returns its information.
    
    Args:
        url (str): YouTube URL to download from
        
    Returns:
        tuple: (filename, video_id, info)
        
    Raises:
        Exception: If download fails
    """
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': f'{DOWNLOAD_DIRECTORY}/%(title)s.%(ext)s'
    }

    info = None

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info)
     
    return filename, info

@upload_bp.route('/download', methods=['GET'])
def download_video():
    url = request.args.get('url')
    test_mode = getattr(upload_bp, 'test_mode', False)
    
    if not url:
        return jsonify({'error': 'No URL provided'}), 400

    if test_mode:
        # Test mode behavior
        return jsonify({
            'message': 'Test mode: Video download simulated',
            'filename': 'test_video.mp4',
            'video_id': 0
        }), 200

    # Download from YouTube
    filename, info = download_from_youtube(url)
    
    # Upload to B2
    b2_file_name = os.path.basename(filename)
    b2_info = upload_to_b2(filename, b2_file_name)
    
    # Get file info
    file_size = os.path.getsize(filename)
    height = info['height']
    width = info['width']
    
    # Add to database with B2 info
    video_id = add_video(
        title=info['title'],
        size=file_size,
        filepath=b2_info['download_url'],  # Store B2 download URL instead of local path
        metadata={
            'youtube_url': url,
            'extracted_yt_info': info,
            'height': height,
            'width': width,
            'b2_file_id': b2_info['file_id'],
            'b2_upload_timestamp': b2_info['upload_timestamp']
        }
    )
    
    # Clean up local file after upload
    os.remove(filename)

    return jsonify({
        'message': 'Video downloaded and uploaded successfully',
        'filename': b2_file_name,
        'video_id': video_id,
        'download_url': b2_info['download_url']
    }), 200

@upload_bp.route('/upload-file', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(DOWNLOAD_DIRECTORY, filename)
    file.save(filepath)
    
    # Get file info
    file_size = os.path.getsize(filepath)
    
    # Upload to B2
    b2_info = upload_to_b2(filepath, filename)
    
    # Add to database with B2 info
    video_id = add_video(
        title=filename,
        size=file_size,
        filepath=b2_info['download_url'],
        metadata={
            'source': 'local_upload',
            'b2_file_id': b2_info['file_id'],
            'b2_upload_timestamp': b2_info['upload_timestamp']
        }
    )
    
    # Clean up local file after upload
    os.remove(filepath)

    return jsonify({
        'message': 'Video uploaded successfully',
        'filename': filename,
        'video_id': video_id,
        'download_url': b2_info['download_url']
    }), 200
    
  