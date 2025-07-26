import os
from flask import render_template, Blueprint

def register(app):
    # Locate the directory containing this file
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

    # Register a Blueprint so Flask can find templates in a custom path
    editor_bp = Blueprint('editor', __name__, template_folder='.')

    @editor_bp.route('/editor/<int:id>')
    def serve_editor(id):
        return render_template('index.html', id=id)

    # Register the blueprint
    app.register_blueprint(editor_bp)
