from flask import Blueprint, request, jsonify
import yt_dlp
import os
from database import add_video

upload_bp = Blueprint('upload', __name__)

DOWNLOAD_DIRECTORY = 'downloads'

if not os.path.exists(DOWNLOAD_DIRECTORY):
    os.makedirs(DOWNLOAD_DIRECTORY)

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

    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': f'{DOWNLOAD_DIRECTORY}/%(title)s.%(ext)s'
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
        
        # Get file size
        file_size = os.path.getsize(filename)
        
        height = info['height']
        width = info['width']
        # Add video to database
        video_id = add_video(
            title=info['title'],
            size=file_size,
            filepath=filename,
            metadata={'youtube_url': url, 'extracted_yt_info': info, 'height': height, 'width': width}
        )
        
        return jsonify({
            'message': 'Video downloaded successfully',
            'filename': os.path.basename(filename),
            'video_id': video_id
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500 