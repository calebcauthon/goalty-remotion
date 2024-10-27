from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import yt_dlp
import os
import argparse
from database import add_video, get_video, get_tables, get_table_data, execute_query

app = Flask(__name__, static_folder='react_app/build', template_folder='templates')
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

@app.route('/api/videos', methods=['GET'])
def get_videos():
    try:
        data, columns = get_table_data('videos')
        videos = [dict(zip(columns, row)) for row in data]
        return jsonify(videos), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Add a new route to get video information
@app.route('/api/videos/<int:video_id>', methods=['GET'])
def get_video_info(video_id):
    video = get_video(video_id)
    if video:
        return jsonify(video), 200
    else:
        return jsonify({'error': 'Video not found'}), 404

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
