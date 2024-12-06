from flask import Blueprint, request, jsonify
import numpy as np
import cv2

homography_bp = Blueprint('homography', __name__)

# Destination points (overhead view)
DST_POINTS = np.float32([
    [0, 0],          # Top-left
    [400, 0],        # Top-right
    [400, 600],      # Bottom-right
    [0, 600]         # Bottom-left
])

@homography_bp.route('/transform', methods=['POST'])
def transform_points():
    try:
        data = request.json
        if not data or 'points' not in data or 'fieldPoints' not in data:
            return jsonify({'error': 'Missing required data (points or fieldPoints)'}), 400

        # Get points and field corners from request
        points = np.array(data['points'])
        field_points = np.array(data['fieldPoints'], dtype=np.float32)
        
        if len(field_points) != 4:
            return jsonify({'error': 'Field points must contain exactly 4 corner points'}), 400
            
        # Calculate homography matrix using the field points
        H = cv2.getPerspectiveTransform(field_points, DST_POINTS)
        
        # Reshape points to (N, 1, 2) format for cv2.perspectiveTransform
        points_reshaped = points.reshape(-1, 1, 2).astype(np.float32)
        
        # Transform points
        transformed_points = cv2.perspectiveTransform(points_reshaped, H)
        
        # Convert back to regular array format
        transformed_points = transformed_points.reshape(-1, 2).tolist()

        return jsonify({
            'transformed_points': transformed_points
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500 