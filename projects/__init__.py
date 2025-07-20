import os
from flask import Flask, render_template_string, send_from_directory

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)  # Go up one level to reach / (for /js access)

@app.route('/projects/<id>')
def serve_index_with_id(id):
    index_path = os.path.join(BASE_DIR, 'index.html')
    try:
        with open(index_path, 'r') as f:
            html = f.read()
        return render_template_string(html, id=id)
    except FileNotFoundError:
        return "index.html not found", 404

@app.route('/js/<path:filename>')
def serve_js(filename):
    js_path = os.path.join(ROOT_DIR, 'js')
    return send_from_directory(js_path, filename)
