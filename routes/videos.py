import os
import json
from flask import Blueprint, request, jsonify
from datetime import datetime
import database
from b2 import b2_api, bucket
from database import add_video, get_video, get_tables, get_table_data, execute_query, update_video_metadata, commit_query
import cv2
import base64
import numpy as np
from io import BytesIO
from PIL import Image

videos_bp = Blueprint('videos', __name__)

@videos_bp.route('/', methods=['GET'])
def get_videos():
    try:
        data, columns = get_table_data('videos')
        videos = [dict(zip(columns, row)) for row in data]
        return jsonify(videos), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@videos_bp.route('/with-tags', methods=['GET'])
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

@videos_bp.route('/<int:video_id>', methods=['GET'])
def get_video_info(video_id):
    video = get_video(video_id)
    if video:
        return jsonify(video), 200
    else:
        return jsonify({'error': 'Video not found'}), 404

@videos_bp.route('/<int:video_id>/metadata', methods=['POST'])
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

@videos_bp.route('/<int:video_id>', methods=['DELETE'])
def delete_video(video_id):
    video = get_video(video_id)
    if not video:
        return jsonify({'error': 'Video not found'}), 404

    filename = video['filepath'].split('/')[-1]

    if 'b2_file_id' in video.get('metadata', {}).keys():
        bucket.delete_file_version(video['metadata']['b2_file_id'], filename)
    else:
        print(f"b2 file_id not found for Video: {video}")

    # Delete from database
    query = "DELETE FROM videos WHERE id = ?"
    commit_query(query, (video_id,))

    return jsonify({'message': 'Video deleted successfully'}), 200

@videos_bp.route('/<int:video_id>/title', methods=['PUT'])
def update_video_title(video_id):
    try:
        new_title = request.json.get('title')
        if not new_title:
            return jsonify({'error': 'No title provided'}), 400

        query = "UPDATE videos SET title = ? WHERE id = ?"
        commit_query(query, (new_title, video_id))

        return jsonify({'message': 'Title updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@videos_bp.route('/first-frame', methods=['POST'])
def get_first_frame():
    try:
        video_url = request.json.get('url')
        if not video_url:
            return jsonify({'error': 'No video URL provided'}), 400
            
        # Download video file or access it
        import urllib.parse
        cap = cv2.VideoCapture(urllib.parse.quote(video_url, safe=':/?='))
        
        # Read the first frame
        ret, frame = cap.read()
        cap.release()
        
        if not ret:
            return jsonify({'error': 'Could not read frame'}), 400
            
        # Convert BGR to RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Convert to PIL Image
        pil_image = Image.fromarray(frame_rgb)
        
        # Save to bytes
        img_io = BytesIO()
        pil_image.save(img_io, 'JPEG', quality=70)
        img_io.seek(0)
        
        # Convert to base64
        img_base64 = base64.b64encode(img_io.getvalue()).decode()
        
        return jsonify({
            'image': img_base64,
            'width': pil_image.width,
            'height': pil_image.height
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    
