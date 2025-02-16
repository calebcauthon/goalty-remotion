from flask import Blueprint, jsonify, request
import traceback
import os
from routes.videos import get_video, extract_frame_with_box, classify_frame_with_roboflow

datasets_bp = Blueprint('datasets', __name__)

@datasets_bp.route('/analyze-frames', methods=['GET'])
def analyze_frames():
    try:
        print("\n=== Starting analyze_frames ===")
        video_id = request.args.get('video_id', type=int)
        start_frame = request.args.get('start_frame', type=int, default=0)
        end_frame = request.args.get('end_frame', type=int)
        skip = request.args.get('skip', type=int, default=0)  # 0 means no skip
        
        print(f"Parameters: video_id={video_id}, start_frame={start_frame}, end_frame={end_frame}, skip={skip}")
        
        if not video_id:
            return jsonify({'error': 'Missing video_id'}), 400

        # Get video info
        video = get_video(video_id)
        if not video:
            return jsonify({'error': 'Video not found'}), 404
        print(f"Found video: {video['filepath']}")

        # Get boxes data from metadata
        video_metadata = video.get('metadata', {})
        boxes_data = video_metadata.get('boxes', [])
        
        print(f"Found {len(boxes_data)} total frames in boxes data")
        
        if not boxes_data:
            return jsonify({'error': 'No boxes data found for video'}), 404

        # Limit to frame range
        if end_frame is None:
            end_frame = len(boxes_data) - 1
            print(f"No end_frame specified, using {end_frame}")
            
        if start_frame > end_frame or start_frame >= len(boxes_data):
            print(f"Invalid frame range: start={start_frame}, end={end_frame}, total frames={len(boxes_data)}")
            return jsonify({'error': 'Invalid frame range'}), 400

        results = []
        holding_summary = []
        print(f"\nProcessing frames {start_frame} to {end_frame}" + (f" (skipping every {skip} frames)" if skip else ""))
        
        frame_count = 0
        # Process each frame in range
        for frame_num in range(start_frame, min(end_frame + 1, len(boxes_data))):
            # Skip frames based on skip parameter
            if skip > 0 and frame_count > 0 and frame_count % (skip + 1) != 0:
                frame_count += 1
                continue
                
            frame_count += 1
            frame_boxes = boxes_data[frame_num]
            print(f"\nFrame {frame_num}: Found {len(frame_boxes)} boxes")
            
            frame_results = {
                'frame': frame_num,
                'players': {}
            }
            
            # Process each box in frame
            for player_name, box_data in frame_boxes.items():
                bbox = box_data['bbox']
                print(f"  ↳ Processing {player_name}: bbox={bbox}")
                
                try:
                    # Extract frame with box
                    frame = extract_frame_with_box(
                        video['filepath'],
                        frame_num,
                        bbox[0], bbox[1], bbox[2], bbox[3],
                        crop=True,
                        pad_crop=5
                    )
                    print(f"  ↳ Successfully extracted frame")
                    
                    # Classify with Roboflow
                    classification = classify_frame_with_roboflow(frame)
                    
                    # Find frisbee confidence
                    frisbee_conf = next(
                        (pred['confidence'] for pred in classification['predictions'] 
                         if pred['class'] == 'frisbee'), 
                        0.0
                    )
                    
                    # Determine if holding based on threshold
                    is_holding = frisbee_conf > 0.3
                    print(f"  ↳ Frisbee confidence: {frisbee_conf:.2f}, is_holding: {is_holding}")
                    
                    if is_holding:
                        holding_summary.append(f"frame {frame_num}: {player_name} is holding the frisbee ({frisbee_conf:.2f} confidence)")
                    
                    frame_results['players'][player_name] = {
                        'bbox': bbox,
                        'is_holding': is_holding,
                        'frisbee_confidence': frisbee_conf,
                        'classification': {
                            'predictions': classification['predictions']
                        }
                    }
                    
                except Exception as e:
                    print(f"  ↳ Error processing frame {frame_num}, player {player_name}: {str(e)}")
                    print(f"  ↳ Full traceback: {traceback.format_exc()}")
                    continue

            results.append(frame_results)

        print(f"\nProcessing complete: {len(results)} total results")
        print(f"Found {len(holding_summary)} frames with players holding frisbee")
        return jsonify({
            'video_id': video_id,
            'frame_range': {
                'start': start_frame,
                'end': end_frame,
                'skip': skip
            },
            'total_processed': len(results),
            'holding_summary': holding_summary,
            'results': results
        }), 200

    except Exception as e:
        print(f"\n=== Error in analyze_frames ===")
        print(f"Error message: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 400 