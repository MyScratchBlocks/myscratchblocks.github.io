import os
from flask import render_template_string, send_from_directory

def register(app):
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))       # /projects
    ROOT_DIR = os.path.dirname(BASE_DIR)                        # /
    JS_DIR = os.path.join(ROOT_DIR, 'js')                       # /js
    INDEX_PATH = os.path.join(BASE_DIR, 'index.html')           # /editor/index.html

    def serve_editor(id):
        try:
            with open(INDEX_PATH, 'r') as f:
                html = f.read()
            return render_template_string(html, id=id)
        except FileNotFoundError:
            return "index.html not found", 404

    app.add_url_rule('/editor/<id>', 'serve_editor', serve_editor)
