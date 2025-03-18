import os
import json
import tempfile
import pytest
from pathlib import Path
from database_bounding_box import *

@pytest.fixture
def db_path():
    """Create a temporary database for testing"""
    print("Creating temporary database")
    temp_db = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
    db_path = temp_db.name
    temp_db.close()
    init_db(db_path)
    yield db_path
    os.unlink(db_path)

@pytest.fixture(scope="function")
def video_id(db_path):
    """Create a test video and return its ID"""
    return add_video(
        db_path=db_path,
        filename="test_game.mp4",
        duration=120.5,
        total_frames=3000,
        frame_rate=25.0,
        width=1920,
        height=1080,
        b2_path="bucket/test_game.mp4"
    )

@pytest.fixture
def player_ids(db_path):
    """Create test players and return their IDs"""
    print("Creating test players")
    players = ["John Doe", "Jane Smith", "Bob Wilson"]
    return {
        player: add_player(db_path, name=player, team="Test Team")
        for player in players
    }

@pytest.fixture
def frame_ids(db_path, video_id):
    """Create test frames and return their IDs"""
    return {
        frame_num: add_frame(
            db_path=db_path,
            video_id=video_id,
            frame_number=frame_num,
            timestamp=frame_num/25.0
        )
        for frame_num in range(5)
    }

@pytest.fixture
def bounding_boxes(db_path, frame_ids, player_ids):
    """Add bounding boxes for all players in all frames"""
    print(f"Adding bounding boxes for {len(frame_ids)} frames and {len(player_ids)} players")
    bbox_ids = {}
    for frame_num, frame_id in frame_ids.items():
        bbox_ids[frame_num] = {}
        for player_name, player_id in player_ids.items():
            bbox_id = add_bounding_box(
                db_path=db_path,
                frame_id=frame_id,
                player_id=player_id,
                x=100 + frame_num * 10,  # Move right
                y=100 + frame_num * 5,   # Move down
                width=50,
                height=100,
                confidence=0.95
            )
            bbox_ids[frame_num][player_name] = bbox_id
    return bbox_ids

def test_database_init(db_path):
    """Test database initialization"""
    # Check if file exists
    assert os.path.exists(db_path)
    
    # Check if tables were created
    conn = get_db_connection(db_path)
    try:
        cursor = conn.cursor()
        tables = cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
        table_names = {row['name'] for row in tables}
        assert 'videos' in table_names
        assert 'players' in table_names
        assert 'frames' in table_names
        assert 'bounding_boxes' in table_names
    finally:
        conn.close()

def test_video_addition(db_path, video_id):
    """Test video addition"""
    conn = get_db_connection(db_path)
    try:
        video = conn.execute('SELECT * FROM videos WHERE video_id = ?', (video_id,)).fetchone()
        assert video is not None
        assert video['filename'] == "test_game.mp4"
        assert video['duration_seconds'] == 120.5
        assert video['total_frames'] == 3000
        assert video['frame_rate'] == 25.0
        assert video['width'] == 1920
        assert video['height'] == 1080
        assert video['b2_path'] == "bucket/test_game.mp4"
    finally:
        conn.close()

def test_player_addition(db_path, player_ids):
    """Test player addition"""
    conn = get_db_connection(db_path)
    try:
        for player_name, player_id in player_ids.items():
            player = conn.execute('SELECT * FROM players WHERE player_id = ?', (player_id,)).fetchone()
            assert player is not None
            assert player['name'] == player_name
            assert player['team'] == "Test Team"
    finally:
        conn.close()

def test_frame_addition(db_path, video_id, frame_ids):
    """Test frame addition"""
    conn = get_db_connection(db_path)
    try:
        for frame_num, frame_id in frame_ids.items():
            frame = conn.execute('SELECT * FROM frames WHERE frame_id = ?', (frame_id,)).fetchone()
            assert frame is not None
            assert frame['video_id'] == video_id
            assert frame['frame_number'] == frame_num
            assert frame['timestamp_seconds'] == pytest.approx(frame_num/25.0)
    finally:
        conn.close()

def test_bounding_box_addition(db_path, bounding_boxes):
    """Test bounding box addition"""
    conn = get_db_connection(db_path)
    try:
        for frame_num, frame_boxes in bounding_boxes.items():
            for player_name, bbox_id in frame_boxes.items():
                bbox = conn.execute('SELECT * FROM bounding_boxes WHERE bbox_id = ?', (bbox_id,)).fetchone()
                assert bbox is not None
                assert bbox['x'] == pytest.approx(100 + frame_num * 10)
                assert bbox['y'] == pytest.approx(100 + frame_num * 5)
                assert bbox['width'] == 50
                assert bbox['height'] == 100
                assert bbox['confidence'] == pytest.approx(0.95)
    finally:
        conn.close()

def test_any_bounding_boxes(db_path, bounding_boxes):
    """Test that there are any bounding boxes in the database"""
    conn = get_db_connection(db_path)
    try:
        bbox_count = conn.execute('SELECT COUNT(*) FROM bounding_boxes').fetchone()[0]
        assert bbox_count > 0
    finally:
        conn.close()


def test_frame_query(db_path, video_id, bounding_boxes):
    """Test querying bounding boxes for a specific frame"""
    frame_boxes = get_frame_bounding_boxes(db_path, video_id=video_id, frame_number=2)
    assert len(frame_boxes) == 3  # Should have 3 players
    
    for box in frame_boxes:
        assert 'name' in box
        assert box['x'] == pytest.approx(120)  # 100 + 2 * 10
        assert box['y'] == pytest.approx(110)  # 100 + 2 * 5
        assert box['width'] == 50
        assert box['height'] == 100
        assert box['confidence'] == pytest.approx(0.95)

def test_player_tracking(db_path, video_id, bounding_boxes):
    """Test getting tracking data for a specific player"""
    track_data = get_player_tracking(db_path, video_id=video_id, player_name="John Doe")
    assert len(track_data) == 5  # Should have data for all 5 frames
    
    for i, pos in enumerate(track_data):
        assert pos['frame_number'] == i
        assert pos['x'] == pytest.approx(100 + i * 10)
        assert pos['y'] == pytest.approx(100 + i * 5)
        assert pos['width'] == 50
        assert pos['height'] == 100
        assert pos['confidence'] == pytest.approx(0.95)

def test_json_export_import(db_path, video_id, bounding_boxes):
    """Test JSON export and import functionality"""
    # Export data
    json_data = export_video_bounding_boxes(db_path, video_id)
    assert len(json_data) == 3000  # Total frames
    assert json_data[2] != {}  # Frame 2 should have data
    
    # Create new video and import data
    new_video_id = add_video(
        db_path=db_path,
        filename="test_game2.mp4",
        duration=120.5,
        total_frames=3000,
        frame_rate=25.0,
        width=1920,
        height=1080
    )
    
    import_bounding_boxes_json(db_path, new_video_id, json_data)
    
    # Verify imported data
    imported_boxes = get_frame_bounding_boxes(db_path, video_id=new_video_id, frame_number=2)
    assert len(imported_boxes) == 3  # Should have 3 players
    
    for box in imported_boxes:
        assert 'name' in box
        assert box['x'] == pytest.approx(120)  # 100 + 2 * 10
        assert box['y'] == pytest.approx(110)  # 100 + 2 * 5
        assert box['width'] == 50
        assert box['height'] == 100 