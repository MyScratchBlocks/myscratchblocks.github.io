import os
import base64
import json
from datetime import datetime

import requests
from flask import request, jsonify, session, render_template
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

def register_login(app):
    GH_KEY = os.getenv('GH_KEY')
    GITHUB_REPO = "kRxZykRxZy/ScratchGems-MAIN"
    GITHUB_BRANCH = "main"
    DB_PATH = "db/myscratchblocks"
    GH_API_URL = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{DB_PATH}?ref={GITHUB_BRANCH}"
    PROJECTS_API = "https://editor-compiler.onrender.com/api/projects"

    headers = {
        "Authorization": f"token {GH_KEY}",
        "Accept": "application/vnd.github.v3+json"
    }

    def get_user_file(username: str):
        file_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{DB_PATH}/{username}.json?ref={GITHUB_BRANCH}"
        r = requests.get(file_url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            content = base64.b64decode(data['content']).decode('utf-8')
            user_data = json.loads(content)
            user_data['_sha'] = data['sha']
            return user_data
        return None

    def create_or_update_user_file(username: str, user_data: dict):
        file_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{DB_PATH}/{username}.json"
        content_str = json.dumps(user_data, indent=2)
        content_b64 = base64.b64encode(content_str.encode()).decode()

        r = requests.get(file_url + f"?ref={GITHUB_BRANCH}", headers=headers)
        sha = None
        if r.status_code == 200:
            sha = r.json()['sha']

        payload = {
            "message": f"Update user {username}",
            "content": content_b64,
            "branch": GITHUB_BRANCH
        }
        if sha:
            payload["sha"] = sha

        r = requests.put(file_url, headers=headers, json=payload)
        return r.status_code in [200, 201]

    def fetch_available_project_ids():
        r = requests.get(PROJECTS_API)
        if r.status_code != 200:
            return set()
        return {project["id"] for project in r.json()}

    def filter_user_projects(user_data):
        available_ids = fetch_available_project_ids()
        filtered = [proj for proj in user_data.get("projects", []) if proj["id"] in available_ids]
        user_data["projects"] = filtered
        r = requests.get(f'https://editor-compiler.onrender.com/userapi/{user_data["username"]}')
        stats_data = r.json()
        user_data["stats"] = stats_data.get("stats", {})
        return user_data

    def save_profile_picture(file, username):
        if not file:
            return None
        os.makedirs("static/uploads", exist_ok=True)
        filename = secure_filename(f"{username}_{datetime.utcnow().timestamp()}.png")
        upload_path = os.path.join("static/uploads", filename)
        file.save(upload_path)
        return f"/static/uploads/{filename}"

    # --- API Endpoints ---

    @app.route('/api/register', methods=['POST'])
    def register():
        data = request.json
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')

        if not username or not email or not password:
            return jsonify({"error": "Username, email, and password are required"}), 400

        if get_user_file(username):
            return jsonify({"error": "Username already exists"}), 400

        password_hash = generate_password_hash(password)
        user_data = {
            "username": username,
            "email": email,
            "password": password_hash,
            "profile_bio": "A passionate creator.",
            "profile_pic_url": f"https://placehold.co/120x120/a78bfa/ffffff?text={username[0].upper()}",
            "discord_link": "#",
            "followers": 0,
            "following": 0,
            "totalProjects": 0,
            "totalViews": 0,
            "totalLikes": 0,
            "totalFavorites": 0,
            "achievements": [],
            "created_at": datetime.utcnow().isoformat()
        }

        success = create_or_update_user_file(username, user_data)
        if not success:
            return jsonify({"error": "Failed to save user"}), 500

        return jsonify({"message": "User registered successfully"})

    @app.route('/api/login', methods=['POST'])
    def login():
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        user_data = get_user_file(username)
        if not user_data or not check_password_hash(user_data['password'], password):
            return jsonify({"error": "Invalid username or password"}), 401

        user_data = filter_user_projects(user_data)
        user_data.pop('password', None)
        user_data.pop('_sha', None)
        session['user'] = user_data
        session['username'] = username

        return jsonify({"message": "Login successful", "user": user_data})

    @app.route('/api/logout', methods=['POST'])
    def logout():
        session.pop('user', None)
        session.pop('username', None)
        return jsonify({"message": "Logged out successfully"})

    @app.route('/api/profile', methods=['GET'])
    def profile():
        user = session.get('user')
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        return jsonify(user)

    @app.route('/api/users/<username>', methods=['GET'])
    def get_user(username):
        user_data = get_user_file(username)
        if not user_data:
            return jsonify({"error": "User not found"}), 404
        user_data = filter_user_projects(user_data)
        user_data.pop('password', None)
        user_data.pop('_sha', None)
        return jsonify(user_data)

    @app.route('/api/users', methods=['GET'])
    def get_all_users():
        r = requests.get(GH_API_URL, headers=headers)
        if r.status_code != 200:
            return jsonify({'error': f"Failed to list users: {r.status_code}"}), 500

        files = r.json()
        users = []
        for file in files:
            if not file['name'].endswith('.json'):
                continue
            username = file['name'][:-5]
            user_data = get_user_file(username)
            if user_data:
                user_data = filter_user_projects(user_data)
                user_data.pop('password', None)
                user_data.pop('_sha', None)
                users.append(user_data)
        return jsonify(users)

    @app.route('/api/edit_profile/<username>', methods=['PUT', 'POST'])
    def edit_profile(username):
        if 'user' not in session or session['user']['username'] != username:
            return jsonify({"error": "Unauthorized"}), 401

        if request.method == 'POST':
            data = request.form
            file = request.files.get('profile_pic')
        else:
            data = request.json
            file = None

        user_data = get_user_file(username)
        if not user_data:
            return jsonify({"error": "User not found"}), 404

        editable_fields = [
            "profile_bio", "profile_pic_url", "discord_link", "email", "achievements",
            "followers", "following", "totalProjects", "totalViews", "totalLikes", "totalFavorites"
        ]

        for field in editable_fields:
            if field in data:
                user_data[field] = data[field]

        if file:
            image_url = save_profile_picture(file, username)
            if image_url:
                user_data["profile_pic_url"] = image_url

        success = create_or_update_user_file(username, user_data)
        if not success:
            return jsonify({"error": "Failed to update profile"}), 500

        user_data.pop('password', None)
        user_data.pop('_sha', None)
        session['user'] = user_data
        return jsonify({"message": "Profile updated successfully", "user": user_data})

    @app.route('/users/<username>')
    def user_profile_page(username):
        user_data = get_user_file(username)
        if not user_data:
            return "User not found", 404

        user_data = filter_user_projects(user_data)
        user_data.pop('password', None)
        user_data.pop('_sha', None)

        is_owner = session.get('user', {}).get('username') == username

        return render_template('user_page.html', profile_user=user_data, is_owner=is_owner, logged_in_username=session.get('username'))
 
