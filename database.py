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

        conn.execute('''
            CREATE TABLE IF NOT EXISTS hotkeys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                shortcuts TEXT NOT NULL
            )
        ''')

        # Check if default hotkeys exist
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM hotkeys')
        count = cursor.fetchone()[0]

        # Insert default hotkeys if none exist
        if count == 0:
            default_shortcuts = {
                't': {'action': 'addTag', 'description': 'Add a tag at the current frame'},
                'ArrowLeft': {'action': 'seekBackward', 'description': 'Move backward in the video'},
                'ArrowRight': {'action': 'seekForward', 'description': 'Move forward in the video'},
                'h': {'action': 'addHighlight', 'description': 'Add a highlight at the current frame'},
                '[': {'action': 'slowDown', 'description': 'Decrease playback speed'},
                ']': {'action': 'speedUp', 'description': 'Increase playback speed'},
                '\\': {'action': 'resetSpeed', 'description': 'Reset playback speed to normal'},
                ' ': {'action': 'togglePlayPause', 'description': 'Play or pause the video'}
            }
            
            cursor.execute('''
                INSERT INTO hotkeys (name, shortcuts)
                VALUES (?, ?)
            ''', ('Default Group (Auto-Created)', json.dumps(default_shortcuts)))
            
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
    film = dict(zip(columns, data[0]))
    # Parse the data JSON if it exists
    if film.get('data'):
        try:
            film['data'] = json.loads(film['data'])
        except json.JSONDecodeError:
            film['data'] = {}
    return film

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

# Add these new functions for hotkey management
def get_all_hotkeys():
    query = 'SELECT * FROM hotkeys'
    data, columns = execute_query(query)
    hotkeys = []
    for row in data:
        hotkey = dict(zip(columns, row))
        hotkey['shortcuts'] = json.loads(hotkey['shortcuts'])
        hotkeys.append(hotkey)
    return hotkeys

def add_hotkey_group(name, shortcuts):
    query = 'INSERT INTO hotkeys (name, shortcuts) VALUES (?, ?)'
    return commit_query(query, (name, json.dumps(shortcuts)))

def update_hotkey_group(group_id, name, shortcuts):
    query = 'UPDATE hotkeys SET name = ?, shortcuts = ? WHERE id = ?'
    return commit_query(query, (name, json.dumps(shortcuts), group_id))

def update_hotkey_group_name(group_id, new_name):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE hotkeys SET name = ? WHERE id = ?",
            (new_name, group_id)
        )
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        print(f"Error updating hotkey group name: {e}")
        raise
    finally:
        if conn:
            conn.close()

def update_hotkey_shortcuts(group_id, shortcuts):
    try:
        # Assuming you have a hotkeys table with columns: id, name, shortcuts
        query = """
            UPDATE hotkeys 
            SET shortcuts = ?
            WHERE id = ?
        """
        # Convert shortcuts dict to JSON string if your DB stores it as text
        shortcuts_json = json.dumps(shortcuts)
        commit_query(query, (shortcuts_json, group_id))
        return True
    except Exception as e:
        print(f"Error updating hotkey shortcuts: {e}")
        return False

def update_film_data(film_id, data):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE films SET data = ? WHERE id = ?',
                (json.dumps(data), film_id)
            )
            conn.commit()
            return cursor.rowcount > 0
    except Exception as e:
        print(f"Error updating film data: {e}")
        return False
