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
from routes.upload import upload_bp, DOWNLOAD_DIRECTORY
import requests
from b2 import bucket


app = Flask(__name__, static_folder='react_app/build', template_folder='templates')
CORS(app)
CORS(films_bp)
CORS(videos_bp)
CORS(hotkeys_bp)
CORS(upload_bp)

app.register_blueprint(films_bp, url_prefix='/api/films')
app.register_blueprint(videos_bp, url_prefix='/api/videos')
app.register_blueprint(hotkeys_bp, url_prefix='/api/hotkeys')
app.register_blueprint(upload_bp, url_prefix='/api')

if not os.path.exists(DOWNLOAD_DIRECTORY):
    os.makedirs(DOWNLOAD_DIRECTORY)

# Add a global variable to track test mode
test_mode = False

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

@app.route('/api/cloud-render', methods=['POST'])
def cloud_render():
    data = request.json
    data['chunk_size'] = 250
    filename = data.get('output_file_name')
    url = "https://calebcauthon-dev--remotion-goalty-render-video-split-ren-7c32e7.modal.run"

    try:
        # Fire and forget - don't wait for response
        requests.post(url, json=data, timeout=1)
    except requests.exceptions.Timeout:
        # Ignore timeout - request will continue in background
        pass
    except requests.exceptions.RequestException:
        # Ignore any other request errors
        pass
    
    download_url = bucket.get_download_url(filename)
    return jsonify({
        'message': 'Cloud render initiated',
        'download_url': download_url
    }), 202

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
