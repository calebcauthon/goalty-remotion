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
from routes.bounding_boxes import bp as bounding_boxes_bp
import requests
from b2 import bucket
from routes.homography import homography_bp
from routes.datasets import datasets_bp


app = Flask(__name__, static_folder='react_app/build', template_folder='templates')
CORS(app)
CORS(films_bp)
CORS(videos_bp)
CORS(hotkeys_bp)
CORS(upload_bp)
CORS(bounding_boxes_bp)

app.register_blueprint(films_bp, url_prefix='/api/films')
app.register_blueprint(videos_bp, url_prefix='/api/videos')
app.register_blueprint(hotkeys_bp, url_prefix='/api/hotkeys')
app.register_blueprint(upload_bp, url_prefix='/api')
app.register_blueprint(homography_bp, url_prefix='/api/homography')
app.register_blueprint(datasets_bp, url_prefix='/datasets')
app.register_blueprint(bounding_boxes_bp, url_prefix='/bounding-boxes')

if not os.path.exists(DOWNLOAD_DIRECTORY):
    os.makedirs(DOWNLOAD_DIRECTORY)

# Add a global variable to track test mode
test_mode = False

# New route for the studio page
@app.route('/studio', methods=['GET', 'POST'])
def studio():
    tables = get_tables()
    selected_table = request.form.get('table', tables[0] if tables else None)
    select_query = request.form.get('select_query', f'SELECT * FROM {selected_table}' if selected_table else '')
    update_query = request.form.get('update_query', f'UPDATE {selected_table} SET column = value WHERE id = ' if selected_table else '')
    
    results = []
    columns = []
    error = None
    update_message = None
    
    if request.form.get('execute_select') and select_query:
        try:
            results, columns = execute_query(select_query)
        except Exception as e:
            error = str(e)
            
    if request.form.get('execute_update') and update_query:
        try:
            commit_query(update_query)
            update_message = "Update executed successfully"
        except Exception as e:
            error = str(e)
    
    return render_template('studio.html', 
                         tables=tables, 
                         selected_table=selected_table,
                         select_query=select_query,
                         update_query=update_query,
                         results=results, 
                         columns=columns, 
                         error=error,
                         update_message=update_message)

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
    data['chunk_size'] = 1000
    filename = data.get('output_file_name')
    # Make sure composition_name gets passed through
    composition_name = data.get('composition_name', 'VideoFirstFiveSeconds')
    data['composition_name'] = composition_name
    
    url = "https://calebcauthon-dev--remotion-goalty-render-video-split-ren-7c32e7.modal.run"

    try:
        requests.post(url, json=data, timeout=1)
    except requests.exceptions.Timeout:
        pass
    except requests.exceptions.RequestException:
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
