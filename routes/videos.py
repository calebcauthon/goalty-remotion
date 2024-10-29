from flask import Blueprint, request, jsonify
from datetime import datetime
import database
from database import add_video, get_video, get_tables, get_table_data, execute_query, update_video_metadata, commit_query

videos_bp = Blueprint('videos', __name__)

@videos_bp.route('/', methods=['GET'])
def get_videos():
    try:
        data, columns = get_table_data('videos')
        videos = [dict(zip(columns, row)) for row in data]
        return jsonify(videos), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500