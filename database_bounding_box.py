import sqlite3
import json
from pathlib import Path
import os

def get_db_connection(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path):
    conn = get_db_connection(db_path)
    try:
        # Videos table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS videos (
                video_id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                duration_seconds FLOAT NOT NULL,
                total_frames INTEGER NOT NULL,
                frame_rate FLOAT NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                b2_path TEXT
            )
        ''')

        # Players table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS players (
                player_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                team TEXT,
                UNIQUE(name)
            )
        ''')

        # Frames table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS frames (
                frame_id INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id INTEGER NOT NULL,
                frame_number INTEGER NOT NULL,
                timestamp_seconds FLOAT,
                processed BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (video_id) REFERENCES videos(video_id),
                UNIQUE(video_id, frame_number)
            )
        ''')

        # Bounding boxes table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS bounding_boxes (
                bbox_id INTEGER PRIMARY KEY AUTOINCREMENT,
                frame_id INTEGER NOT NULL,
                player_id INTEGER NOT NULL,
                x FLOAT NOT NULL,
                y FLOAT NOT NULL,
                width FLOAT NOT NULL,
                height FLOAT NOT NULL,
                confidence FLOAT,
                FOREIGN KEY (frame_id) REFERENCES frames(frame_id),
                FOREIGN KEY (player_id) REFERENCES players(player_id),
                UNIQUE(frame_id, player_id)
            )
        ''')

        # Create indexes
        conn.execute('CREATE INDEX IF NOT EXISTS idx_frames_video_number ON frames(video_id, frame_number)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_bboxes_frame ON bounding_boxes(frame_id)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_bboxes_player ON bounding_boxes(player_id)')

        conn.commit()
    finally:
        conn.close()

def add_video(db_path, filename, duration, total_frames, frame_rate, width, height, b2_path=None):
    conn = get_db_connection(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO videos (filename, duration_seconds, total_frames, frame_rate, width, height, b2_path)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (filename, duration, total_frames, frame_rate, width, height, b2_path))
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()

def add_player(db_path, name, team=None):
    conn = get_db_connection(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR IGNORE INTO players (name, team)
            VALUES (?, ?)
        ''', (name, team))
        conn.commit()
        return cursor.lastrowid or cursor.execute('SELECT player_id FROM players WHERE name = ?', (name,)).fetchone()[0]
    finally:
        conn.close()

def add_frame(db_path, video_id, frame_number, timestamp=None):
    conn = get_db_connection(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR IGNORE INTO frames (video_id, frame_number, timestamp_seconds)
            VALUES (?, ?, ?)
        ''', (video_id, frame_number, timestamp))
        conn.commit()
        return cursor.lastrowid or cursor.execute(
            'SELECT frame_id FROM frames WHERE video_id = ? AND frame_number = ?', 
            (video_id, frame_number)
        ).fetchone()[0]
    finally:
        conn.close()

def add_bounding_box(db_path, frame_id, player_id, x, y, width, height, confidence=None):
    conn = get_db_connection(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO bounding_boxes (frame_id, player_id, x, y, width, height, confidence)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (frame_id, player_id, x, y, width, height, confidence))
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()

def get_frame_bounding_boxes(db_path, video_id, frame_number):
    conn = get_db_connection(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT p.name, b.x, b.y, b.width, b.height, b.confidence
            FROM bounding_boxes b
            JOIN frames f ON b.frame_id = f.frame_id
            JOIN players p ON b.player_id = p.player_id
            WHERE f.video_id = ? AND f.frame_number = ?
        ''', (video_id, frame_number))
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

def get_player_tracking(db_path, video_id, player_name):
    conn = get_db_connection(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT f.frame_number, b.x, b.y, b.width, b.height, b.confidence
            FROM bounding_boxes b
            JOIN frames f ON b.frame_id = f.frame_id
            JOIN players p ON b.player_id = p.player_id
            WHERE f.video_id = ? AND p.name = ?
            ORDER BY f.frame_number
        ''', (video_id, player_name))
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

def export_video_bounding_boxes(db_path, video_id):
    """Export bounding boxes in the format expected by the system"""
    conn = get_db_connection(db_path)
    try:
        cursor = conn.cursor()
        
        # Get total frames
        video = cursor.execute('SELECT total_frames FROM videos WHERE video_id = ?', (video_id,)).fetchone()
        if not video:
            return None
            
        result = [{} for _ in range(video['total_frames'])]
        
        # Get all bounding boxes for the video
        cursor.execute('''
            SELECT f.frame_number, p.name, b.x, b.y, b.width, b.height
            FROM bounding_boxes b
            JOIN frames f ON b.frame_id = f.frame_id
            JOIN players p ON b.player_id = p.player_id
            WHERE f.video_id = ?
            ORDER BY f.frame_number
        ''', (video_id,))
        
        for row in cursor.fetchall():
            frame_num = row['frame_number']
            if 0 <= frame_num < len(result):
                if not result[frame_num]:
                    result[frame_num] = {}
                result[frame_num][row['name']] = {
                    'bbox': [row['x'], row['y'], row['width'], row['height']],
                    'frame': frame_num
                }
        
        return result
    finally:
        conn.close()

def import_bounding_boxes_json(db_path, video_id, boxes_data):
    """Import bounding boxes from the JSON format used by the system"""
    conn = get_db_connection(db_path)
    try:
        cursor = conn.cursor()
        
        for frame_num, frame_data in enumerate(boxes_data):
            if not frame_data:  # Skip empty frames
                continue
                
            frame_id = add_frame(db_path, video_id, frame_num)
            
            for player_name, player_data in frame_data.items():
                player_id = add_player(db_path, player_name)
                bbox = player_data['bbox']
                
                add_bounding_box(
                    db_path=db_path,
                    frame_id=frame_id,
                    player_id=player_id,
                    x=bbox[0],
                    y=bbox[1],
                    width=bbox[2],
                    height=bbox[3]
                )
        
        conn.commit()
    finally:
        conn.close()

def execute_sql(db_path, query, params=()):
    conn = get_db_connection(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()

def get_all_videos(db_path, limit=None):
    limit_clause = f" LIMIT {limit}" if limit else ""
    return execute_sql(db_path, f"SELECT * FROM videos ORDER BY video_id{limit_clause}")

def get_all_players(db_path, limit=None):
    limit_clause = f" LIMIT {limit}" if limit else ""
    return execute_sql(db_path, f"SELECT * FROM players ORDER BY player_id{limit_clause}")

def get_all_frames(db_path, limit=None):
    limit_clause = f" LIMIT {limit}" if limit else ""
    return execute_sql(db_path, f"""
        SELECT f.*, v.filename 
        FROM frames f 
        JOIN videos v ON f.video_id = v.video_id 
        ORDER BY f.frame_id{limit_clause}
    """)

def get_all_bounding_boxes(db_path, limit=None):
    limit_clause = f" LIMIT {limit}" if limit else ""
    return execute_sql(db_path, f"""
        SELECT b.*, p.name as player_name, f.frame_number, v.filename
        FROM bounding_boxes b
        JOIN players p ON b.player_id = p.player_id
        JOIN frames f ON b.frame_id = f.frame_id
        JOIN videos v ON f.video_id = v.video_id
        ORDER BY b.bbox_id{limit_clause}
    """)

# Initialize the database when this module is imported
init_db('bounding_boxes.db') 