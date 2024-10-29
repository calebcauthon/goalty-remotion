from flask import Flask, request, jsonify, send_from_directory, render_template, send_file
from flask_cors import CORS
import yt_dlp
import os
import argparse
import json
from database import add_video, get_video, get_tables, get_table_data, execute_query, update_video_metadata, commit_query, get_films, create_film, get_film_by_id
import database
from datetime import datetime

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

# Add this new route after the existing /api/videos route
@app.route('/api/videos/with-tags', methods=['GET'])
def get_videos_with_tags():
    try:
        query = """
        SELECT v.id, v.title as name, v.metadata, v.filepath
        FROM videos v
        """
        data, columns = execute_query(query)
        videos = []
        for row in data:
            video_dict = dict(zip(columns, row))
            # Extract tags from metadata if it exists
            tags = []
            if video_dict['metadata']:
                try:
                    metadata = json.loads(video_dict['metadata'])
                    tags = metadata.get('tags', [])
                except json.JSONDecodeError:
                    tags = []
            video_dict['tags'] = tags
            videos.append(video_dict)
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

# Add a new route to serve video files
@app.route('/downloads/<path:filename>')
def serve_video(filename):
    return send_from_directory(DOWNLOAD_DIRECTORY, filename)

# Add a new route to save video metadata
@app.route('/api/videos/<int:video_id>/metadata', methods=['POST'])
def save_video_metadata(video_id):
    try:
        metadata = request.json.get('metadata')
        if not metadata:
            return jsonify({'error': 'No metadata provided'}), 400

        # Parse the metadata string into a Python dictionary
        metadata_dict = json.loads(metadata)

        # Update the video metadata in the database
        update_video_metadata(video_id, metadata_dict)

        return jsonify({'message': 'Metadata saved successfully'}), 200
    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid JSON in metadata'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/films', methods=['GET'])
def get_films():
    try:
        films = database.get_films()
        return jsonify(films), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/films', methods=['POST'])
def create_film():
    try:
        name = request.json.get('name', 'Untitled Film')
        created_date = datetime.now().isoformat()
        
        film_id = database.create_film(name, created_date)
        
        return jsonify({
            'id': film_id,
            'name': name,
            'created_date': created_date,
            'data': {}
        }), 201
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500

@app.route('/api/films/<int:film_id>', methods=['GET'])
def get_film(film_id):
    try:
        film = database.get_film_by_id(film_id)
        if not film:
            return jsonify({'error': 'Film not found'}), 404
        return jsonify(film), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/films/<int:film_id>/name', methods=['PUT'])
def update_film_name(film_id):
    try:
        name = request.json.get('name')
        if not name:
            return jsonify({'error': 'Name is required'}), 400
            
        success = database.update_film_name(film_id, name)
        if not success:
            return jsonify({'error': 'Film not found'}), 404
            
        return jsonify({'message': 'Film name updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Add this new route after the other film routes
@app.route('/api/films/<int:film_id>', methods=['DELETE'])
def delete_film(film_id):
    try:
        success = database.delete_film(film_id)
        if not success:
            return jsonify({'error': 'Film not found'}), 404
        return jsonify({'message': 'Film deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Add this new route for deleting videos
@app.route('/api/videos/<int:video_id>', methods=['DELETE'])
def delete_video(video_id):
    try:
        # Get the video information first
        video = get_video(video_id)
        if not video:
            return jsonify({'error': 'Video not found'}), 404

        # Delete the file from the filesystem
        if os.path.exists(video['filepath']):
            os.remove(video['filepath'])

        # Delete from database
        query = "DELETE FROM videos WHERE id = ?"
        commit_query(query, (video_id,))

        return jsonify({'message': 'Video deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
