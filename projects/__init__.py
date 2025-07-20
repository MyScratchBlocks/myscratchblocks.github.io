import os
from flask import render_template_string, send_from_directory

def register_routes(app):
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))       # /projects
    ROOT_DIR = os.path.dirname(BASE_DIR)                        # /
    JS_DIR = os.path.join(ROOT_DIR, 'js')
    I_DIR = os.path.join(ROOT_DIR, 'images')                       # /js
    INDEX_PATH = os.path.join(BASE_DIR, 'index.html')           # /projects/index.html

    def serve_root(id):
        try:
            with open(INDEX_PATH, 'r') as f:
                html = f.read()
            return render_template_string(html, id=id)
        except FileNotFoundError:
            return "index.html not found", 404

    def serve_js(filename):
        return send_from_directory(JS_DIR, filename)

    def serve_images(filename):
        return send_from_directory(I_DIR, filename)

    app.add_url_rule('/projects/<id>', 'serve_root', serve_root)
    app.add_url_rule('/js/<path:filename>', 'serve_js', serve_js)
    app.add_url_rule('/images/<path:filename>', 'serve_images', serve_images)
