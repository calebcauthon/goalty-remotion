from flask import Blueprint, request, jsonify
import yt_dlp
import os
from database import add_video
from werkzeug.utils import secure_filename
from b2 import check_file_exists_in_b2

upload_bp = Blueprint('upload', __name__)

DOWNLOAD_DIRECTORY = 'downloads'

if not os.path.exists(DOWNLOAD_DIRECTORY):
    os.makedirs(DOWNLOAD_DIRECTORY)

ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'mkv'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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
        # Check if file exists in B2
        exists = check_file_exists_in_b2(filename)
        return jsonify({
            'status': 'completed' if exists else 'rendering',
            'filename': filename
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    
  