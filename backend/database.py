import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "stackchat.db")

def get_connection():
    return sqlite3.connect(DB_PATH)

def init_db():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                folder_path TEXT NOT NULL
            )
        """)
        try:
            conn.execute("ALTER TABLE projects ADD COLUMN pinned BOOLEAN DEFAULT 0")
        except sqlite3.OperationalError:
            pass # Column already exists
            
        conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
        """)
        conn.commit()

init_db()

def create_project(name: str, folder_path: str):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO projects (name, folder_path) VALUES (?, ?)", (name, folder_path))
        conn.commit()
        return cursor.lastrowid

def get_projects():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, folder_path, COALESCE(pinned, 0) FROM projects ORDER BY COALESCE(pinned, 0) DESC, id DESC")
        return [{"id": row[0], "name": row[1], "folder_path": row[2], "pinned": bool(row[3])} for row in cursor.fetchall()]

def get_project(project_id: int):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, folder_path FROM projects WHERE id = ?", (project_id,))
        row = cursor.fetchone()
        if row:
            return {"id": row[0], "name": row[1], "folder_path": row[2]}
        return None

def add_message(project_id: int, role: str, content: str):
    with get_connection() as conn:
        conn.execute("INSERT INTO messages (project_id, role, content) VALUES (?, ?, ?)", (project_id, role, content))
        conn.commit()

def get_messages(project_id: int):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT role, content FROM messages WHERE project_id = ? ORDER BY id ASC", (project_id,))
        return [{"role": row[0], "content": row[1]} for row in cursor.fetchall()]

def rename_project(project_id: int, new_name: str):
    with get_connection() as conn:
        conn.execute("UPDATE projects SET name = ? WHERE id = ?", (new_name, project_id))
        conn.commit()

def delete_project(project_id: int):
    with get_connection() as conn:
        conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        conn.commit()

def set_project_pinned(project_id: int, pinned: bool):
    with get_connection() as conn:
        conn.execute("UPDATE projects SET pinned = ? WHERE id = ?", (1 if pinned else 0, project_id))
        conn.commit()
