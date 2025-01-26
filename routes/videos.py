import os
import json
from flask import Blueprint, request, jsonify
from datetime import datetime
import database
from b2 import b2_api, bucket, check_file_exists_in_b2, sam_bucket
from database import add_video, get_video, get_tables, get_table_data, execute_query, update_video_metadata, commit_query
import cv2
import base64
import numpy as np
from io import BytesIO
from PIL import Image
import requests
import urllib.parse
import replicate
import ell

videos_bp = Blueprint('videos', __name__)

# Initialize ell with storage for versioning
ell.init(store='./logdir', autocommit=True)

@ell.simple(model="gpt-4o", temperature=0.75)
def analyze_play(dictation: str, notes: str, frame: int):
    """You are converting dictated notes into a structured format."""
    return f"""Given this dictation of a play at frame {frame}: "{dictation}"
And these additional notes: "{notes}"
Return an array of JSON objects.
Only return the JSON objects, no other text.
Do not start it with ```json or ``` or anything like that. If you do the world will explode.
"""

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
    
@videos_bp.route('/process-tracking', methods=['POST'])
def process_tracking():
    data = request.json
    if not all(k in data for k in ['rectangles', 'sourceUrl', 'outputFilename']):
        return jsonify({
            'error': 'Missing required fields',
            'data': data,
            'required_fields': ['rectangles', 'sourceUrl', 'outputFilename'],
            'included_fields': list(data.keys())
        }), 400

    # Convert rectangles to string format with names
    rect_data = []
    for r in data['rectangles']:
        # Format: x,y,width,height,name (name is optional)
        rect_str = f"{int(r['x'])},{int(r['y'])},{int(r['width'])},{int(r['height'])}"
        if 'name' in r and r['name']:
            if r['name'] == "":
                r['name'] = "-1"
            rect_str += f",{r['name']}"
        else:
            rect_str += ",-1"
        rect_data.append(rect_str)
    
    many_xywh = ','.join(rect_data)

    # Get source filename from URL
    source_filename = data['sourceUrl'].split('/')[-1]
    
    # Get frame range
    start_frame = data.get('startFrame', 0)
    end_frame = data.get('endFrame')
    
    # Call modal endpoint
    modal_url = "https://calebcauthon-dev--remotion-samurai-distribute-processing.modal.run"
    print(f"  ↳ Calling modal endpoint: {modal_url}")
    print(f"  ↳ Many XYWH: {many_xywh}")
    print(f"  ↳ Source filename: {source_filename}")
    print(f"  ↳ Output filename: {data['outputFilename']}")
    print(f"  ↳ Frame range: {start_frame} to {end_frame}")
    
    json_data = {
        'many_xywh': many_xywh,
        'source_filename': source_filename,
        'output_path': data['outputFilename'],
        'frame_range': {
            'start': start_frame,
            'end': end_frame
        } if end_frame is not None else None
    }
    response = requests.post(
        f"{modal_url}",
        json=json_data
    )

    if response.ok:
        return jsonify(response.json()), 200
    else:
        return jsonify({
            'error': f'Modal processing failed: {response.text}',
            'modal_params': json_data,
            'modal_url': modal_url
        }), 400

@videos_bp.route('/b2-info', methods=['POST'])
def get_b2_video_info():
    try:
        video_url = request.json.get('url')
        frame_number = request.json.get('frame_number', 0)  # Default to first frame
        
        if not video_url:
            return jsonify({'error': 'No video URL provided'}), 400
            
        # Download video file or access it
        import urllib.parse
        cap = cv2.VideoCapture(urllib.parse.quote(video_url, safe=':/?='))
        
        if not cap.isOpened():
            return jsonify({'error': 'Could not open video'}), 400
        
        # Get video properties
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = frame_count / fps if fps > 0 else 0

        # Set frame position and read frame
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        ret, frame = cap.read()
        
        if not ret:
            cap.release()
            return jsonify({'error': 'Could not read frame'}), 400

        # Convert frame to base64
        _, buffer = cv2.imencode('.jpg', frame)
        frame_base64 = base64.b64encode(buffer).decode('utf-8')
        
        cap.release()

        # Look for boxes.json file - remove .mp4 if present
        video_filename = video_url.split('/')[-1]
        base_filename = video_filename.replace('.mp4', '')  # Remove .mp4 extension
        boxes_filename = f"{base_filename}.boxes.json"
        
        boxes_data = None
        exists, file_info = check_file_exists_in_b2(boxes_filename, sam_bucket)
        if exists:
            print(f"Downloading boxes data from B2: {boxes_filename}")
            downloaded_file = sam_bucket.download_file_by_name(boxes_filename)
            
            # Create a BytesIO object to read the file contents
            file_data = BytesIO()
            downloaded_file.save(file_data)
            file_data.seek(0)  # Reset position to start of file
            
            # Parse JSON from the file data
            boxes_data = json.loads(file_data.read().decode('utf-8'))
        
        return jsonify({
            'frame_count': frame_count,
            'fps': round(fps, 2),
            'width': width,
            'height': height,
            'duration': round(duration, 2),
            'boxes_data': boxes_data,
            'frame_image': frame_base64
        }), 200
        
    except Exception as e:
        print(f"Error getting video info: {str(e)}")
        return jsonify({'error': str(e)}), 400

@videos_bp.route('/clip-analysis', methods=['POST'])
def analyze_frame_with_clip():
    try:
        data = request.json
        if not all(k in data for k in ['video_url', 'frame_number', 'text_prompt']):
            return jsonify({
                'error': 'Missing required fields',
                'data': data,
                'required_fields': ['video_url', 'frame_number', 'text_prompt'],
                'included_fields': list(data.keys())
            }), 400

        # Extract frame from video
        cap = cv2.VideoCapture(urllib.parse.quote(data['video_url'], safe=':/?='))
        cap.set(cv2.CAP_PROP_POS_FRAMES, data['frame_number'])
        ret, frame = cap.read()
        cap.release()

        if not ret:
            return jsonify({'error': 'Could not read frame'}), 400

        # Convert frame to jpg and base64
        _, img_encoded = cv2.imencode('.jpg', frame)
        img_bytes = img_encoded.tobytes()
        img_base64 = base64.b64encode(img_bytes).decode()

        # Run GroundingDINO
        input = {
            "image": f"data:image/jpeg;base64,{img_base64}",
            "query": data['text_prompt'],
            "box_threshold": 0.2,
            "text_threshold": 0.2
        }

        output = replicate.run(
            "adirik/grounding-dino:efd10a8ddc57ea28773327e881ce95e20cc1d734c589f7dd01d2036921ed78aa",
            input=input
        )

        return jsonify({
            'detections': output['detections'],
            'frame_image': img_base64
        }), 200

    except Exception as e:
        print(f"Error in CLIP analysis: {str(e)}")
        return jsonify({'error': str(e)}), 400

@videos_bp.route('/get-boxes', methods=['POST'])
def get_boxes():
    try:
        video_url = request.json.get('video_url')
        frame_number = request.json.get('frame_number')  # Now optional
        
        if not video_url:
            return jsonify({'error': 'No video URL provided'}), 400
            
        # Get base filename without .mp4
        video_filename = video_url.split('/')[-1]
        base_filename = video_filename.replace('.mp4', '')
        boxes_filename = f"{base_filename}.boxes.json"
        
        # Get boxes data from B2
        print(f"Checking if boxes file exists in B2: {boxes_filename}")
        if check_file_exists_in_b2(boxes_filename, sam_bucket)[0]:
            print(f"  ↳ Boxes file found in B2: {boxes_filename}")
            downloaded_file = sam_bucket.download_file_by_name(boxes_filename)
            file_data = BytesIO()
            downloaded_file.save(file_data)
            file_data.seek(0)
            boxes_data = json.loads(file_data.read().decode('utf-8'))
            
            # If frame_number is specified, return just that frame
            if frame_number is not None:
                if frame_number < len(boxes_data):
                    print(f"  ↳ Returning boxes for frame {frame_number}")
                    return jsonify({
                        'boxes': boxes_data[frame_number],
                        'frame_number': frame_number
                    }), 200
                else:
                    return jsonify({'error': f'Frame {frame_number} not found in boxes data'}), 404
            
            # If no frame_number, return all frames
            print(f"  ↳ Returning all frames")
            return jsonify({
                'boxes': boxes_data,
                'total_frames': len(boxes_data)
            }), 200
            
        else:
            return jsonify({'error': 'No boxes data found for this video'}), 404
            
    except Exception as e:
        print(f"Error getting boxes data: {str(e)}")
        return jsonify({'error': str(e)}), 400

@videos_bp.route('/process-dictation', methods=['POST'])
def process_dictation():
    try:
        data = request.json
        if not all(k in data for k in ['dictation', 'notes', 'frame']):
            return jsonify({'error': 'Missing required fields'}), 400

        # Use our Ell LMP to analyze the play
        analysis = analyze_play(data['dictation'], data['notes'], data['frame'])

        return jsonify({
            'analysis': analysis
        }), 200

    except Exception as e:
        print(f"Error in process_dictation: {str(e)}")
        return jsonify({'error': str(e)}), 400


