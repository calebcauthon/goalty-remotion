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
    try:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            size INTEGER NOT NULL,
            filepath TEXT NOT NULL,
            metadata TEXT
        )
    ''')

        conn.execute('''
            CREATE TABLE IF NOT EXISTS films (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_date TEXT NOT NULL,
                data TEXT
            )
        ''')
        conn.commit()
    finally:
        conn.close()

def add_video(title, size, filepath, metadata=None):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('''
                INSERT INTO videos (title, size, filepath, metadata)
            VALUES (?, ?, ?, ?)
        ''', (title, size, filepath, json.dumps(metadata) if metadata else None))
        conn.commit()
        video_id = cursor.lastrowid
    finally:
        conn.close()
    return video_id

def get_video(video_id):
    conn = get_db_connection()
    try:
        video = conn.execute('SELECT * FROM videos WHERE id = ?', (video_id,)).fetchone()
    finally:
        conn.close()
    if video:
        video = dict(video)
        video['metadata'] = json.loads(video['metadata']) if video['metadata'] else None
    return video

def get_tables():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
    finally:
        conn.close()
    return tables

def get_table_data(table_name):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM {table_name}")
        columns = [description[0] for description in cursor.description]
        data = cursor.fetchall()
    finally:
        conn.close()
    return data, columns

def commit_query(query, params=()):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query, params)
        conn.commit()
        last_id = cursor.lastrowid
    finally:
        conn.close()
    return last_id

def execute_query(query, params=()):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query, params)
        columns = [description[0] for description in cursor.description]
        data = cursor.fetchall()
    finally:
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

# Add these new functions after your existing functions

def get_films():
    """Get all films ordered by created date descending"""
    query = '''
        SELECT * FROM films 
        ORDER BY created_date DESC
    '''
    data, columns = execute_query(query)
    return [dict(zip(columns, row)) for row in data]

def create_film(name, created_date):
    """Create a new film and return its ID"""
    query = '''
        INSERT INTO films (name, created_date, data) 
        VALUES (?, ?, ?)
    '''
    return commit_query(query, (name, created_date, '{}'))

def get_film_by_id(film_id):
    """Get a single film by ID"""
    query = 'SELECT * FROM films WHERE id = ?'
    data, columns = execute_query(query, (film_id,))
    if not data:
        return None
    return dict(zip(columns, data[0]))

def update_film_name(film_id, name):
    """Update a film's name and return True if successful"""
    query = '''
        UPDATE films 
        SET name = ? 
        WHERE id = ?
    '''
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query, (name, film_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()

def delete_film(film_id):
    try:
        query = "DELETE FROM films WHERE id = ?"
        commit_query(query, (film_id,))
        return True
    except Exception as e:
        print(f"Error deleting film: {e}")
        return False
