from flask import Blueprint, jsonify, request, render_template
from flask_restx import Api, Resource, fields, Namespace
from database_bounding_box import (
    get_db_connection,
    get_frame_bounding_boxes,
    get_player_tracking,
    export_video_bounding_boxes,
    import_bounding_boxes_json,
    add_video,
    add_player,
    add_frame,
    add_bounding_box
)

bp = Blueprint('bounding_boxes', __name__, url_prefix='/bounding-boxes')
api = Api(bp, doc='/docs', version='1.0', 
         title='Bounding Box API',
         description='API for managing video bounding boxes and player tracking')

# API Models
video_model = api.model('Video', {
    'video_id': fields.Integer(readonly=True),
    'filename': fields.String(required=True),
    'duration_seconds': fields.Float(required=True),
    'total_frames': fields.Integer(required=True),
    'frame_rate': fields.Float(required=True),
    'width': fields.Integer(required=True),
    'height': fields.Integer(required=True),
    'b2_path': fields.String()
})

player_model = api.model('Player', {
    'player_id': fields.Integer(readonly=True),
    'name': fields.String(required=True),
    'team': fields.String()
})

bbox_model = api.model('BoundingBox', {
    'name': fields.String(),
    'x': fields.Float(),
    'y': fields.Float(),
    'width': fields.Float(),
    'height': fields.Float(),
    'confidence': fields.Float()
})

tracking_model = api.model('TrackingData', {
    'frame_number': fields.Integer(),
    'x': fields.Float(),
    'y': fields.Float(),
    'width': fields.Float(),
    'height': fields.Float(),
    'confidence': fields.Float()
})

# API Routes
@api.route('/api/videos')
class VideoList(Resource):
    @api.marshal_list_with(video_model)
    def get(self):
        """List all videos in the database"""
        conn = get_db_connection('bounding_boxes.db')
        try:
            videos = conn.execute('SELECT * FROM videos').fetchall()
            return [dict(v) for v in videos]
        finally:
            conn.close()

@api.route('/api/videos/<int:video_id>/frames/<int:frame_number>/boxes')
class FrameBoxes(Resource):
    @api.marshal_list_with(bbox_model)
    def get(self, video_id, frame_number):
        """Get bounding boxes for a specific frame"""
        return get_frame_bounding_boxes('bounding_boxes.db', video_id, frame_number)

@api.route('/api/players')
class PlayerList(Resource):
    @api.marshal_list_with(player_model)
    def get(self):
        """List all players in the database"""
        conn = get_db_connection('bounding_boxes.db')
        try:
            players = conn.execute('SELECT * FROM players').fetchall()
            return [dict(p) for p in players]
        finally:
            conn.close()

@api.route('/api/players/<string:player_name>/tracking')
class PlayerTracking(Resource):
    @api.marshal_list_with(tracking_model)
    @api.param('video_id', 'The ID of the video to get tracking data from')
    def get(self, player_name):
        """Get tracking data for a player in a specific video"""
        video_id = request.args.get('video_id', type=int)
        if not video_id:
            api.abort(400, "video_id parameter required")
        
        return get_player_tracking('bounding_boxes.db', video_id, player_name)

@api.route('/api/videos/<int:video_id>/export')
class VideoExport(Resource):
    def get(self, video_id):
        """Export all bounding boxes for a video"""
        return export_video_bounding_boxes('bounding_boxes.db', video_id)

@api.route('/api/videos/<int:video_id>/import')
class VideoImport(Resource):
    @api.expect(api.model('ImportData', {
        'boxes_data': fields.Raw(required=True, description='Bounding box data in JSON format')
    }))
    def post(self, video_id):
        """Import bounding boxes for a video"""
        if not request.is_json:
            api.abort(400, "Content-Type must be application/json")
        
        boxes_data = request.get_json()
        import_bounding_boxes_json('bounding_boxes.db', video_id, boxes_data)
        return {'status': 'success'}

# UI Routes
@bp.route('/', methods=['GET'])
def index():
    conn = get_db_connection('bounding_boxes.db')
    try:
        videos = conn.execute('SELECT * FROM videos').fetchall()
        players = conn.execute('SELECT * FROM players').fetchall()
        return render_template(
            'bounding_boxes/index.html',
            videos=[dict(v) for v in videos],
            players=[dict(p) for p in players]
        )
    finally:
        conn.close()

@bp.route('/videos/<int:video_id>', methods=['GET'])
def video_detail(video_id):
    conn = get_db_connection('bounding_boxes.db')
    try:
        video = conn.execute('SELECT * FROM videos WHERE video_id = ?', (video_id,)).fetchone()
        if not video:
            return 'Video not found', 404
            
        players = conn.execute('SELECT * FROM players').fetchall()
        return render_template(
            'bounding_boxes/video_detail.html',
            video=dict(video),
            players=[dict(p) for p in players]
        )
    finally:
        conn.close()

@bp.route('/players/<string:player_name>', methods=['GET'])
def player_detail(player_name):
    conn = get_db_connection('bounding_boxes.db')
    try:
        player = conn.execute('SELECT * FROM players WHERE name = ?', (player_name,)).fetchone()
        if not player:
            return 'Player not found', 404
            
        videos = conn.execute('SELECT * FROM videos').fetchall()
        return render_template(
            'bounding_boxes/player_detail.html',
            player=dict(player),
            videos=[dict(v) for v in videos]
        )
    finally:
        conn.close() 