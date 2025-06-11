from flask import Flask, render_template, request, jsonify, Response
from functools import wraps
import sqlite3
import os

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), 'todo.db')

# --- Simple HTTP Basic Auth ---
USERNAME = os.environ.get('TODO_USERNAME')
PASSWORD = os.environ.get('TODO_PASSWORD')

def check_auth(username, password):
    return username == USERNAME and password == PASSWORD

def authenticate():
    return Response(
        'Authentication required', 401,
        {'WWW-Authenticate': 'Basic realm="Login Required"'}
    )

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
@requires_auth
def index():
    return render_template('index.html')

@app.route('/api/categories', methods=['GET', 'POST'])
@requires_auth
def categories():
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.get_json()
        name = data.get('name')
        if not name:
            return jsonify({'error': 'Category name required'}), 400
        try:
            conn.execute('INSERT INTO categories (name) VALUES (?)', (name,))
            conn.commit()
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({'error': 'Category already exists'}), 400
        conn.close()
        return jsonify({'success': True})
    else:
        categories = conn.execute('SELECT * FROM categories').fetchall()
        conn.close()
        return jsonify([dict(row) for row in categories])

@app.route('/api/tasks', methods=['GET', 'POST'])
@requires_auth
def tasks():
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.get_json()
        description = data.get('description')
        category_id = data.get('category_id')
        if not description or not category_id:
            return jsonify({'error': 'Task description and category required'}), 400
        conn.execute('INSERT INTO tasks (description, category_id) VALUES (?, ?)', (description, category_id))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    else:
        tasks = conn.execute('SELECT * FROM tasks').fetchall()
        conn.close()
        return jsonify([dict(row) for row in tasks])

@app.route('/api/tasks/<int:task_id>', methods=['PATCH', 'DELETE'])
@requires_auth
def update_task(task_id):
    conn = get_db_connection()
    if request.method == 'PATCH':
        data = request.get_json()
        completed = data.get('completed')
        conn.execute('UPDATE tasks SET completed = ? WHERE id = ?', (int(bool(completed)), task_id))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    elif request.method == 'DELETE':
        conn.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})

@app.route('/shutdown', methods=['POST'])
@requires_auth
def shutdown():
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        return 'Not running with the Werkzeug Server', 500
    func()
    return 'Server shutting down...'

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5050)