from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import yt_dlp
import os
import argparse

app = Flask(__name__, static_folder='react_app/build')
CORS(app)

DOWNLOAD_DIRECTORY = 'downloads'

if not os.path.exists(DOWNLOAD_DIRECTORY):
    os.makedirs(DOWNLOAD_DIRECTORY)

# Add a global variable to track test mode
test_mode = False

@app.route('/api/download', methods=['GET'])
def download_video():
    url = request.args.get('url')
    
    if not url:
        return jsonify({'error': 'No URL provided'}), 400

    if test_mode:
        # Test mode behavior
        return jsonify({
            'message': 'Test mode: Video download simulated',
            'filename': 'test_video.mp4'
        }), 200

    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': f'{DOWNLOAD_DIRECTORY}/%(title)s.%(ext)s'
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
        
        return jsonify({
            'message': 'Video downloaded successfully',
            'filename': os.path.basename(filename)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Serve React App
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Run the Flask app with optional test mode.')
    parser.add_argument('--test', action='store_true', help='Run the app in test mode')
    args = parser.parse_args()

    # Set the global test_mode variable
    test_mode = args.test

    if test_mode:
        print("Running in test mode")
    
    app.run(debug=True)
