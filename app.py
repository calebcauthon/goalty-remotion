from flask import Flask, request, jsonify, send_from_directory, render_template, send_file
from flask_cors import CORS
import yt_dlp
import os
import argparse
from database import add_video, get_video, get_tables, get_table_data, execute_query, update_video_metadata, commit_query
import database
from datetime import datetime
from routes.films import films_bp
from routes.videos import videos_bp
from routes.hotkeys import hotkeys_bp


app = Flask(__name__, static_folder='react_app/build', template_folder='templates')
CORS(app)
CORS(films_bp)
CORS(videos_bp)
CORS(hotkeys_bp)

app.register_blueprint(films_bp, url_prefix='/api/films')
app.register_blueprint(videos_bp, url_prefix='/api/videos')
app.register_blueprint(hotkeys_bp, url_prefix='/api/hotkeys')

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
        
        # Add video to database
        video_id = add_video(
            title=info['title'],
            size=file_size,
            filepath=filename,
            metadata={'youtube_url': url}
        )
        
        return jsonify({
            'message': 'Video downloaded successfully',
            'filename': os.path.basename(filename),
            'video_id': video_id
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# New route for the studio page
@app.route('/studio', methods=['GET', 'POST'])
def studio():
    tables = get_tables()
    selected_table = request.form.get('table', tables[0] if tables else None)
    query = request.form.get('query', f'SELECT * FROM {selected_table}' if selected_table else '')
    
    results = []
    columns = []
    error = None
    
    if query:
        try:
            results, columns = execute_query(query)
        except Exception as e:
            error = str(e)
    
    return render_template('studio.html', tables=tables, selected_table=selected_table, 
                           query=query, results=results, columns=columns, error=error)

# Serve React App
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# Add a new route to serve video files
@app.route('/downloads/<path:filename>')
def serve_video(filename):
    return send_from_directory(DOWNLOAD_DIRECTORY, filename)

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
