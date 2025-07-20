from flask import Flask, render_template_string, send_from_directory
import os

app = Flask(__name__)

@app.route('/projects/<id>')
def project_page(id):
    try:
        with open('index.html', 'r') as f:
            html_content = f.read()
        return render_template_string(html_content, id=id)
    except FileNotFoundError:
        return "index.html not found", 404

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(os.getcwd(), 'js'), filename)
