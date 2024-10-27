import sqlite3
import json
from pathlib import Path

DATABASE_FILE = 'videos.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            size INTEGER NOT NULL,
            filepath TEXT NOT NULL,
            metadata TEXT
        )
    ''')
    conn.commit()
    conn.close()

def add_video(title, size, filepath, metadata=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO videos (title, size, filepath, metadata)
        VALUES (?, ?, ?, ?)
    ''', (title, size, filepath, json.dumps(metadata) if metadata else None))
    conn.commit()
    video_id = cursor.lastrowid
    conn.close()
    return video_id

def get_video(video_id):
    conn = get_db_connection()
    video = conn.execute('SELECT * FROM videos WHERE id = ?', (video_id,)).fetchone()
    conn.close()
    if video:
        video = dict(video)
        video['metadata'] = json.loads(video['metadata']) if video['metadata'] else None
    return video

def get_tables():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()
    return tables

def get_table_data(table_name):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM {table_name}")
    columns = [description[0] for description in cursor.description]
    data = cursor.fetchall()
    conn.close()
    return data, columns

def execute_query(query):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query)
    columns = [description[0] for description in cursor.description]
    data = cursor.fetchall()
    conn.close()
    return data, columns

def update_video_metadata(video_id, metadata):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE videos SET metadata = ? WHERE id = ?",
            (json.dumps(metadata), video_id)
        )
        conn.commit()
    finally:
        conn.close()

# Initialize the database when this module is imported
init_db()
