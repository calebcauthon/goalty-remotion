import os
import json
from flask import Blueprint, request, jsonify, make_response
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
import ell
import traceback
from tqdm import tqdm
from inference_sdk import InferenceHTTPClient

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

def extract_frame_with_box(video_filepath, frame_number, x, y, w, h, crop=False, pad_crop=0, make_dataset=False, player_name='unknown', video_id=None):
    """
    Extract a frame from a video with optional box drawing and cropping.
    
    Args:
        video_filepath: Path to the video file
        frame_number: Frame number to extract
        x, y, w, h: Box coordinates and dimensions (in pixels)
        crop: Whether to crop to just the box region
        pad_crop: Padding around crop in pixels
        make_dataset: Whether to save the frame to dataset
        player_name: Name of player for dataset saving
        video_id: Video ID for dataset saving
    
    Returns:
        numpy array: The processed frame
    """
    try:
        print(f"Getting frame {frame_number} with box [{x}, {y}, {w}, {h}], crop={crop}, pad={pad_crop}, make_dataset={make_dataset}")

        cap = cv2.VideoCapture(urllib.parse.quote(video_filepath, safe=':/?='))
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        ret, frame = cap.read()
        cap.release()

        if not ret:
            raise Exception('Could not read frame')

        # Use pixel coordinates directly
        x_px = int(x)
        y_px = int(y)
        w_px = int(w)
        h_px = int(h)
        
        print(f"Drawing box at: pos=({x_px},{y_px}), size=({w_px},{h_px})")

        height, width = frame.shape[:2]

        if crop:
            # Calculate padded coordinates with bounds checking
            x1 = max(0, x_px - pad_crop)
            y1 = max(0, y_px - pad_crop)
            x2 = min(width, x_px + w_px + pad_crop)
            y2 = min(height, y_px + h_px + pad_crop)
            
            # Extract the padded region
            cropped_frame = frame[y1:y2, x1:x2]
            
            if make_dataset and video_id is not None:
                # Create dataset directory if it doesn't exist
                dataset_dir = 'player_crops'
                os.makedirs(dataset_dir, exist_ok=True)
                
                # Save cropped image
                filename = f"{player_name}_{video_id}_{frame_number}.jpg"
                filepath = os.path.join(dataset_dir, filename)
                print(f"Saving cropped image to {filepath}")
                cv2.imwrite(filepath, cropped_frame)
            
            frame = cropped_frame
        else:
            # Draw rectangle on full frame
            color = (0, 255, 0)  # Green in BGR
            thickness = 2
            start_point = (x_px, y_px)
            end_point = (x_px + w_px, y_px + h_px)
            frame = cv2.rectangle(frame, start_point, end_point, color, thickness)

        return frame

    except Exception as e:
        print(f"Error processing frame: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        raise

@videos_bp.route('/<int:video_id>/frame-with-box', methods=['GET'])
def get_frame_with_box(video_id):
    try:
        frame_number = request.args.get('frame', type=int)
        x = request.args.get('x', type=float)
        y = request.args.get('y', type=float)
        w = request.args.get('w', type=float)
        h = request.args.get('h', type=float)
        crop = request.args.get('crop', type=bool, default=False)
        pad_crop = request.args.get('pad_crop', type=int, default=0)
        make_dataset = request.args.get('make_dataset', type=bool, default=False)
        name_prefix = request.args.get('name_prefix', default='')
        player_name = request.args.get('player_name', default='unknown')
        
        if frame_number is None or any(v is None for v in [x, y, w, h]):
            return jsonify({'error': 'Missing required parameters: frame, x, y, w, h'}), 400

        video = get_video(video_id)
        if not video:
            return jsonify({'error': 'Video not found'}), 404

        # Combine prefix with player name
        full_player_name = f"{name_prefix}{player_name}"

        frame = extract_frame_with_box(
            video['filepath'], 
            frame_number, 
            x, y, w, h,
            crop=crop,
            pad_crop=pad_crop,
            make_dataset=make_dataset,
            player_name=full_player_name,
            video_id=video_id
        )

        # Convert to JPEG
        _, buffer = cv2.imencode('.jpg', frame)
        response = make_response(buffer.tobytes())
        response.headers['Content-Type'] = 'image/jpeg'
        
        return response

    except Exception as e:
        print(f"Error in frame-with-box route: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 400

def collect_frames_for_batch(boxes_data, frame_range, player_name, catch_throw_ranges=None, skip=0, name_prefix='', is_throw_sequence=True):
    """
    Collect frames for batch processing.
    
    Args:
        boxes_data: Dictionary of frame boxes
        frame_range: Tuple of (start_frame, end_frame)
        player_name: Name of player to track
        catch_throw_ranges: List of catch/throw ranges for checking exclusions
        skip: Number of frames to skip
        name_prefix: Prefix for player name in output
        is_throw_sequence: If True, this is a throw sequence. If False, it's outside throw sequences
    
    Returns:
        List of tuples (frame_number, player_name, bbox)
    """
    frame_data = []
    frame_count = 0
    start_frame, end_frame = frame_range
    
    for frame in range(start_frame, end_frame + 1):
        # Apply skip logic
        if skip > 0 and frame_count > 0 and frame_count % (skip + 1) != 0:
            frame_count += 1
            continue
            
        if frame < len(boxes_data):
            frame_boxes = boxes_data[frame]
            
            if is_throw_sequence:
                # For throw sequences, only get the specific player
                if player_name in frame_boxes:
                    box_data = frame_boxes[player_name]
                    suffix = '' if is_throw_sequence else '_non_throw'
                    frame_data.append((
                        frame,
                        f"{name_prefix}{player_name}{suffix}",
                        box_data['bbox']
                    ))
            else:
                # For non-throw sequences, get all players not in sequences
                for p_name, box_data in frame_boxes.items():
                    # Check if this player is in a catch/throw sequence
                    is_in_sequence = False
                    if catch_throw_ranges:
                        is_in_sequence = any(
                            r['player'] == p_name and 
                            r['range'][0] <= frame <= r['range'][1] 
                            for r in catch_throw_ranges
                        )
                    
                    if not is_in_sequence:
                        suffix = '' if is_throw_sequence else '_non_throw'
                        frame_data.append((
                            frame,
                            f"{name_prefix}{p_name}{suffix}",
                            box_data['bbox']
                        ))
        
        frame_count += 1
    
    return frame_data

@videos_bp.route('/<int:video_id>/player-trajectories', methods=['GET'])
def get_player_trajectories(video_id):
    print(f"Getting player trajectories for video {video_id}")
    try:
        print(f"\n=== Getting trajectories for video {video_id} ===")
        start_frame = request.args.get('start_frame', type=int, default=0)
        make_dataset = request.args.get('make_dataset', type=bool, default=False)
        skip = request.args.get('skip', type=int, default=0)
        invert = request.args.get('invert', type=bool, default=False)
        name_prefix = request.args.get('name_prefix', default='')

        video = get_video(video_id)
        if not video:
            return jsonify({'error': 'Video not found'}), 404

        video_metadata = video.get('metadata')
        tags = video_metadata.get('tags', [])
        print(f"Found {len(tags)} total tags")

        # Find max frame from tags
        max_frame = max((tag.get('frame', 0) for tag in tags), default=0)
        end_frame = request.args.get('end_frame', type=int, default=max_frame)
        
        print(f"Frame range: {start_frame} to {end_frame} (max tag frame: {max_frame}), make_dataset={make_dataset}, skip={skip}, invert={invert}, name_prefix={name_prefix}")

        # Filter tags by frame range
        if start_frame > 0:
            tags = [tag for tag in tags if tag.get('frame', 0) >= start_frame]
        if end_frame < max_frame:
            tags = [tag for tag in tags if tag.get('frame', 0) <= end_frame]
        print(f"After frame range filter: {len(tags)} tags")

        video_filename = video['filepath'].split('/')[-1]
        base_filename = video_filename.replace('.mp4', '')
        boxes_filename = f"{base_filename}.boxes.json"
        print(f"Looking for boxes file: {boxes_filename}")

        if not check_file_exists_in_b2(boxes_filename, sam_bucket)[0]:
            return jsonify({'error': 'No boxes data found for this video'}), 404

        downloaded_file = sam_bucket.download_file_by_name(boxes_filename)
        file_data = BytesIO()
        downloaded_file.save(file_data)
        file_data.seek(0)
        boxes_data = json.loads(file_data.read().decode('utf-8'))
        print(f"Loaded boxes data: {len(boxes_data)} frames")

        # If inverting, first collect all catch/throw ranges with buffer
        catch_throw_ranges = []
        if invert:
            buffer_frames = 30  # frames to skip before/after catch/throw
            print("\n=== Collecting catch/throw ranges with buffer ===")
            for i, tag in enumerate(tags):
                tag_name = tag.get('name', '')
                if 'catch' in tag_name.lower():
                    player_name = tag_name.split(' catch')[0].strip()
                    catch_frame = tag.get('frame')
                    print(f"\nFound catch by {player_name} at frame {catch_frame}")
                    
                    # Look for next throw by same player
                    for next_tag in tags[i+1:]:
                        next_tag_name = next_tag.get('name', '')
                        if ('throw' in next_tag_name.lower() and 
                            next_tag_name.startswith(player_name)):
                            throw_frame = next_tag.get('frame')
                            # Add buffer to range
                            buffered_start = max(0, catch_frame - buffer_frames)
                            buffered_end = throw_frame + buffer_frames
                            print(f"  ↳ Found throw at frame {throw_frame}")
                            print(f"  ↳ Adding buffered range: {buffered_start} to {buffered_end} for {player_name}")
                            catch_throw_ranges.append({
                                'player': player_name,
                                'range': (buffered_start, buffered_end)
                            })
                            break

        trajectories = []
        if invert:
            # Process frames outside catch/throw ranges
            all_frames = set(range(start_frame or 0, (end_frame or len(boxes_data))))
            print(f"\n=== Processing inverted frames ===")
            print(f"Total frames: {len(all_frames)}")
            

            frame_data = collect_frames_for_batch(
                boxes_data,
                (min(all_frames), max(all_frames)),
                None,  # No specific player for inverted mode
                catch_throw_ranges=catch_throw_ranges,  # Pass the ranges
                skip=skip,
                name_prefix=name_prefix,
                is_throw_sequence=False
            )

            if make_dataset:
                if frame_data:
                    batch_extract_frames(
                        video['filepath'],
                        frame_data,
                        pad_crop=5,
                        video_id=video_id
                    )
            
            # For inverted mode, we don't return trajectory data
            return jsonify({
                'message': f'Processed {len(all_frames)} frames outside catch/throw sequences',
                'frame_data': frame_data,
                'frame_range': {
                    'start': start_frame,
                    'end': end_frame
                }
            }), 200
        else:
            # Original catch/throw trajectory processing
            for i, tag in enumerate(tags):
                tag_name = tag.get('name', '')
                if 'catch' in tag_name.lower():
                    player_name = tag_name.split(' catch')[0].strip()
                    catch_frame = tag.get('frame')
                    print(f"\nFound catch by {player_name} at frame {catch_frame}")
                    
                    # Look for next throw by same player within frame range
                    for next_tag in tags[i+1:]:
                        next_tag_name = next_tag.get('name', '')
                        if ('throw' in next_tag_name.lower() and 
                            next_tag_name.startswith(player_name)):
                            throw_frame = next_tag.get('frame')
                            print(f"  ↳ Found matching throw at frame {throw_frame}")
                            
                            # Limit to 15 frames after catch
                            throw_frame = min(throw_frame, catch_frame + 15)
                            print(f"  ↳ Limited to frame {throw_frame} (15 frames after catch)")

                            # Skip if throw is outside requested range
                            if end_frame is not None and throw_frame > end_frame:
                                print(f"  ↳ Skipping: throw frame {throw_frame} > end frame {end_frame}")
                                continue

                            player_boxes = []
                            frame_count = 0  # Counter for skip logic
                            for frame in range(catch_frame, throw_frame + 1):
                                # Skip frames based on skip parameter
                                if skip > 0 and frame_count > 0 and frame_count % (skip + 1) != 0:
                                    frame_count += 1
                                    continue
                                    
                                if frame < len(boxes_data):
                                    frame_boxes = boxes_data[frame]
                                    print(f"  ↳ Frame {frame} has {len(frame_boxes)} boxes")
                                    print(f"  ↳ Boxes: {frame_boxes}")
                                    
                                    if player_name in frame_boxes:
                                        box_data = frame_boxes[player_name]
                                        print(f"  ↳ Found box for {player_name}: {box_data}")
                                        bbox = box_data['bbox']
                                        
                                        # Create dataset image if requested
                                        if make_dataset:
                                            try:
                                                extract_frame_with_box(
                                                    video['filepath'],
                                                    frame,
                                                    bbox[0], bbox[1], bbox[2], bbox[3],
                                                    crop=True,
                                                    pad_crop=5,
                                                    make_dataset=True,
                                                    player_name=f"{name_prefix}{player_name}",
                                                    video_id=video_id
                                                )
                                                print(f"  ↳ Created dataset image for frame {frame}")
                                            except Exception as e:
                                                print(f"  ↳ Error creating dataset image for frame {frame}: {str(e)}")
                                        
                                        player_boxes.append({
                                            'frame': frame,
                                            'bbox': bbox
                                        })
                                
                                frame_count += 1
                            
                            if player_boxes:
                                print(f"  ↳ Found {len(player_boxes)} boxes for trajectory")
                                
                                # Update frame URLs
                                for box in player_boxes:
                                    bbox = box['bbox']
                                    box['frame_url'] = f"/videos/{video_id}/frame-with-box?frame={box['frame']}&x={bbox[0]}&y={bbox[1]}&w={bbox[2]}&h={bbox[3]}&player_name={name_prefix}{player_name}"
                                
                                if make_dataset:
                                    frame_data = collect_frames_for_batch(
                                        boxes_data,
                                        (catch_frame, throw_frame),
                                        player_name,
                                        skip=skip,
                                        name_prefix=name_prefix,
                                        is_throw_sequence=True
                                    )
                                    
                                    if frame_data:
                                        batch_extract_frames(
                                            video['filepath'],
                                            frame_data,
                                            pad_crop=5,
                                            video_id=video_id
                                        )

                                trajectories.append({
                                    'player': player_name,
                                    'start_frame': catch_frame,
                                    'end_frame': throw_frame,
                                    'boxes': player_boxes
                                })
                            else:
                                print(f"  ↳ Warning: No boxes found for this trajectory")
                            break

            print(f"\nFound {len(trajectories)} total trajectories")
            return jsonify({
                'trajectories': trajectories,
                'frame_range': {
                    'start': start_frame,
                    'end': end_frame
                }
            }), 200

    except Exception as e:
        print(f"Error getting player trajectories: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 400

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

        # Convert frame to jpg and base64
        temp_jpg = "temp_frame.jpg"
        cv2.imwrite(temp_jpg, frame)
        with open(temp_jpg, 'rb') as f:
            img_bytes = f.read()
        os.remove(temp_jpg)  # Clean up
        img_base64 = base64.b64encode(img_bytes).decode('utf-8')
        
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
            'frame_image': img_base64
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
        temp_jpg = "temp_frame.jpg"
        cv2.imwrite(temp_jpg, frame)
        with open(temp_jpg, 'rb') as f:
            img_bytes = f.read()
        os.remove(temp_jpg)  # Clean up
        img_base64 = base64.b64encode(img_bytes).decode('utf-8')


        response = requests.post(
            'https://calebcauthon-dev--object-detection-detect.modal.run',
            json={'image_path': img_base64},
            headers={'Content-Type': 'application/json'}
        )
        output = response.json()
        print(f"Base64 image: {img_base64}")

        return jsonify({
            'detections': output['predictions'],
            'frame_image': img_base64,
            'frame_used_by_inference': output['image_path']
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

def batch_extract_frames(video_filepath, frame_data, pad_crop=5, video_id=None):
    try:
        if not frame_data:
            return
            
        total_frames = len(frame_data)
        print(f"\nStarting batch extraction of {total_frames} frames")
        
        # Sort by frame number for sequential access
        frame_data.sort(key=lambda x: x[0])
        
        # Create dataset directory
        dataset_dir = 'player_crops'
        os.makedirs(dataset_dir, exist_ok=True)

        cap = cv2.VideoCapture(urllib.parse.quote(video_filepath, safe=':/?='))
        if not cap.isOpened():
            raise Exception("Could not open video")

        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        
        current_frame = -1
        successful_crops = 0
        failed_crops = 0
        
        # Create progress bar
        pbar = tqdm(frame_data, desc="Extracting frames", unit="frame")
        
        for frame_number, player_name, bbox in pbar:
            # Update progress bar description
            pbar.set_description(f"Processing frame {frame_number} for {player_name}")
            
            # Skip to next required frame
            if frame_number != current_frame + 1:
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
            
            ret, frame = cap.read()
            if not ret:
                failed_crops += 1
                pbar.write(f"❌ Error reading frame {frame_number}")
                continue
                
            current_frame = frame_number
            
            try:
                # Crop with padding
                x, y, w, h = map(int, bbox)
                x1 = max(0, x - pad_crop)
                y1 = max(0, y - pad_crop)
                x2 = min(width, x + w + pad_crop)
                y2 = min(height, y + h + pad_crop)
                
                cropped = frame[y1:y2, x1:x2]
                
                # Save cropped image
                filename = f"{player_name}_{video_id}_{frame_number}.jpg"
                filepath = os.path.join(dataset_dir, filename)
                cv2.imwrite(filepath, cropped)
                
                successful_crops += 1
                pbar.write(f"✅ Saved crop for {player_name} at frame {frame_number}")
                
            except Exception as e:
                failed_crops += 1
                pbar.write(f"❌ Error processing frame {frame_number}: {str(e)}")
                continue
                
        cap.release()
        pbar.close()
        
        # Print summary
        print(f"\nBatch extraction complete:")
        print(f"  ↳ Total frames processed: {total_frames}")
        print(f"  ↳ Successful crops: {successful_crops}")
        print(f"  ↳ Failed crops: {failed_crops}")
        print(f"  ↳ Success rate: {(successful_crops/total_frames)*100:.1f}%")

    except Exception as e:
        print(f"Error in batch extraction: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        raise

@videos_bp.route('/create-dataset-csv', methods=['GET'])
def create_dataset_csv():
    try:
        dataset_dir = 'player_crops'
        if not os.path.exists(dataset_dir):
            return jsonify({'error': 'Dataset directory not found'}), 404

        # Get all jpg files
        image_files = [f for f in os.listdir(dataset_dir) if f.endswith('.jpg')]
        
        # Create CSV content
        csv_rows = ['filename,frisbee,not_holding_frisbee']  # Header
        
        for filename in image_files:
            # Determine if holding frisbee based on filename
            if filename.startswith('holding_'):
                frisbee, not_holding = 1, 0
            elif filename.startswith('not_holding_'):
                frisbee, not_holding = 0, 1
            else:
                continue
                
            csv_rows.append(f'{filename},{frisbee},{not_holding}')
        
        # Write to CSV file
        csv_path = os.path.join(dataset_dir, 'classes.csv')
        with open(csv_path, 'w') as f:
            f.write('\n'.join(csv_rows))
            
        return jsonify({
            'message': 'CSV file created successfully',
            'total_images': len(csv_rows) - 1,  # Subtract header
            'csv_path': csv_path
        }), 200

    except Exception as e:
        print(f"Error creating dataset CSV: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 400

def classify_frame_with_roboflow(frame):
    """
    Classify an image frame using Roboflow API
    
    Args:
        frame: numpy array of the image
        
    Returns:
        dict containing classification results and base64 image
    """
    try:
        # Convert frame to base64
        _, buffer = cv2.imencode('.jpg', frame)
        image_base64 = base64.b64encode(buffer).decode('utf-8')

        # Save frame temporarily
        temp_jpg = "temp_frame.jpg"
        cv2.imwrite(temp_jpg, frame)

        # Initialize Roboflow client
        client = InferenceHTTPClient(
            api_url="https://detect.roboflow.com",
            api_key="pH2eX46dBGLw2Gh1ofek"
        )

        try:
            result = client.infer(temp_jpg, model_id="classify-frisbee/3")
            
            # Clean up temp file
            os.remove(temp_jpg)
            
            # Add base64 image to result
            result['image'] = image_base64
            
            return result

        except Exception as e:
            # Clean up temp file even if there's an error
            if os.path.exists(temp_jpg):
                os.remove(temp_jpg)
            raise e

    except Exception as e:
        print(f"Error in Roboflow classification: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        raise

@videos_bp.route('/roboflow-classify', methods=['POST'])
def roboflow_classify():
    try:
        # Get request data
        data = request.json
        video_id = data.get('video_id')
        frame_number = data.get('frame_number')
        bbox = data.get('bbox')  # Should be [x, y, width, height]
        
        if not all([video_id, frame_number is not None, bbox]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Get video info
        video = get_video(video_id)
        if not video:
            return jsonify({'error': 'Video not found'}), 404

        # Extract frame with bounding box
        try:
            frame = extract_frame_with_box(
                video['filepath'],
                frame_number,
                bbox[0], bbox[1], bbox[2], bbox[3],
                crop=True,
                pad_crop=5
            )
        except Exception as e:
            return jsonify({'error': f'Failed to extract frame: {str(e)}'}), 400

        # Run classification
        try:
            result = classify_frame_with_roboflow(frame)
            return jsonify(result), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 400

    except Exception as e:
        print(f"Error in roboflow classify endpoint: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 400


