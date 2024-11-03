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
from b2sdk.v2 import *
import time


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

info = InMemoryAccountInfo()
b2_api = B2Api(info)

# Add your B2 credentials - you'll want to move these to environment variables
B2_KEY_ID = os.getenv('B2_KEY_ID')
B2_APPLICATION_KEY = os.getenv('B2_APP_KEY')
B2_BUCKET_NAME = 'remotion-videos'

# Initialize B2 connection
b2_api.authorize_account("production", B2_KEY_ID, B2_APPLICATION_KEY)
bucket = b2_api.get_bucket_by_name(B2_BUCKET_NAME)

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
    filename = data.get('output_file_name')
    url = "https://calebcauthon-dev--remotion-goalty-render-video-render-video.modal.run"

    response = requests.post(url, json=data)
    print(response.json())
    if response.status_code == 200:
        download_url = bucket.get_download_url(filename)

        return jsonify({
            'message': 'Cloud render completed successfully',
            'download_url': download_url
        }), 200
    else:
        return jsonify({
            'error': 'Failed to initiate cloud render', 
            'status_code': response.status_code, 
            'response': response.json()
        }), response.status_code

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
