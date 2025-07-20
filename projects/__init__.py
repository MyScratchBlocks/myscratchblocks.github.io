from flask import *

def init_projects(app):
    @app.route('/projects/<int:id>')
    def projects(id):
      return render_template('./index.html', id)
