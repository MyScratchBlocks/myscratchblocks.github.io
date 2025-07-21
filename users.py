import os
import base64
import json
from datetime import datetime

import requests
from flask import Flask, request, jsonify, session, render_template
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

    def get_user_file(username):
        file_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{DB_PATH}/{username}.json?ref={GITHUB_BRANCH}"
        r = requests.get(file_url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            content = base64.b64decode(data['content']).decode('utf-8')
            user_data = json.loads(content)
            user_data['_sha'] = data['sha']
            return user_data
        return None

    def create_or_update_user_file(username, user_data):
        file_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{DB_PATH}/{username}.json"
        content_str = json.dumps(user_data, indent=2)
        content_b64 = base64.b64encode(content_str.encode()).decode()

        r = requests.get(file_url + f"?ref={GITHUB_BRANCH}", headers=headers)
        sha = r.json()['sha'] if r.status_code == 200 else None

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
        try:
            data = r.json()
            if isinstance(data, list):
                return {p["id"] for p in data if isinstance(p, dict) and "id" in p}
        except Exception:
            return set()
        return set()

    def filter_user_projects(user_data):
        available_ids = fetch_available_project_ids()
        filtered = [proj for proj in user_data.get("projects", []) if proj["id"] in available_ids]
        user_data["projects"] = filtered
        try:
            r = requests.get(f'https://editor-compiler.onrender.com/userapi/{user_data["username"]}')
            stats_data = r.json()
            user_data["stats"] = stats_data.get("stats", {})
        except Exception:
            user_data["stats"] = {}
        return user_data

    def save_profile_picture(file, username):
        if not file:
            return None
        os.makedirs("static/uploads", exist_ok=True)
        filename = secure_filename(f"{username}_{datetime.utcnow().timestamp()}.png")
        upload_path = os.path.join("static/uploads", filename)
        file.save(upload_path)
        return f"/static/uploads/{filename}"

    @app.route('/api/register', methods=['POST'])
    def register():
        data = request.json
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')

        if not username or not email or not password:
            return jsonify({"error": "All fields required"}), 400

        if get_user_file(username):
            return jsonify({"error": "Username already exists"}), 400

        user_data = {
            "username": username,
            "email": email,
            "password": generate_password_hash(password),
            "profile_bio": "A passionate creator.",
            "profile_pic_url": f"https://placehold.co/120x120/a78bfa/ffffff?text={username[0].upper()}",
            "discord_link": "#",
            "followers": 0,
            "following": 0,
            "followers_list": [],
            "following_list": [],
            "projects": [],
            "achievements": [],
            "totalProjects": 0,
            "totalViews": 0,
            "totalLikes": 0,
            "totalFavorites": 0,
            "created_at": datetime.utcnow().isoformat()
        }

        if not create_or_update_user_file(username, user_data):
            return jsonify({"error": "Could not save user"}), 500

        return jsonify({"message": "Registered successfully"})

    @app.route('/api/login', methods=['POST'])
    def login():
        data = request.json
        username = data.get('username')
        password = data.get('password')

        user_data = get_user_file(username)
        if not user_data or not check_password_hash(user_data['password'], password):
            return jsonify({"error": "Invalid credentials"}), 401

        user_data = filter_user_projects(user_data)
        user_data.pop('password', None)
        user_data.pop('_sha', None)
        session['user'] = user_data
        session['username'] = username

        return jsonify({"message": "Login successful", "user": user_data})

    @app.route('/api/logout', methods=['POST'])
    def logout():
        session.clear()
        return jsonify({"message": "Logged out"})

    @app.route('/api/profile', methods=['GET'])
    def profile():
        user = session.get('user')
        return jsonify(user) if user else jsonify({"error": "Unauthorized"}), 401

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
            return jsonify({'error': "Failed to fetch users"}), 500

        users = []
        for file in r.json():
            if file['name'].endswith('.json'):
                uname = file['name'][:-5]
                udata = get_user_file(uname)
                if udata:
                    udata = filter_user_projects(udata)
                    udata.pop('password', None)
                    udata.pop('_sha', None)
                    users.append(udata)
        return jsonify(users)

    @app.route('/api/edit_profile/<username>', methods=['POST', 'PUT'])
    def edit_profile(username):
        if session.get('username') != username:
            return jsonify({"error": "Unauthorized"}), 401

        data = request.form if request.method == 'POST' else request.json
        file = request.files.get('profile_pic') if request.method == 'POST' else None

        user_data = get_user_file(username)
        if not user_data:
            return jsonify({"error": "User not found"}), 404

        for field in ['profile_bio', 'email', 'discord_link']:
            if field in data:
                user_data[field] = data[field]

        if file:
            img_url = save_profile_picture(file, username)
            if img_url:
                user_data['profile_pic_url'] = img_url

        if not create_or_update_user_file(username, user_data):
            return jsonify({"error": "Update failed"}), 500

        user_data.pop('password', None)
        user_data.pop('_sha', None)
        session['user'] = user_data
        return jsonify({"message": "Profile updated", "user": user_data})

    @app.route('/users/<username>')
    def user_page(username):
        user_data = get_user_file(username)
        if not user_data:
            return "User not found", 404

        user_data = filter_user_projects(user_data)
        user_data.pop('password', None)
        user_data.pop('_sha', None)
        is_owner = session.get('username') == username
        return render_template('user_page.html', profile_user=user_data, is_owner=is_owner)

    @app.route('/users/<username>/followers')
    def followers_page(username):
        user_data = get_user_file(username)
        if not user_data:
            return "User not found", 404
        user_data.pop('password', None)
        user_data.pop('_sha', None)
        followers = []
        for uname in user_data.get("followers_list", []):
            u = get_user_file(uname)
            if u:
                u.pop('password', None)
                u.pop('_sha', None)
                followers.append({
                    "username": u['username'],
                    "profile_pic_url": u.get('profile_pic_url', '/images/default-avatar.png'),
                    "profile_bio": u.get('profile_bio', '')
                })
        return render_template("followers.html", profile_user=user_data, followers=followers)

    @app.route('/users/<username>/following')
    def following_page(username):
        user_data = get_user_file(username)
        if not user_data:
            return "User not found", 404
        user_data.pop('password', None)
        user_data.pop('_sha', None)
        following = []
        for uname in user_data.get("following_list", []):
            u = get_user_file(uname)
            if u:
                u.pop('password', None)
                u.pop('_sha', None)
                following.append({
                    "username": u['username'],
                    "profile_pic_url": u.get('profile_pic_url', '/images/default-avatar.png'),
                    "profile_bio": u.get('profile_bio', '')
                })
        return render_template("following.html", profile_user=user_data, following=following)

    @app.route('/api/users/<username>/follow', methods=['POST'])
    def follow_user(username):
        current_user = session.get('username')
        if not current_user or current_user == username:
            return jsonify({"error": "Invalid action"}), 400

        target = get_user_file(username)
        follower = get_user_file(current_user)
        if not target or not follower:
            return jsonify({"error": "User not found"}), 404

        if username not in follower['following_list']:
            follower['following_list'].append(username)
        if current_user not in target['followers_list']:
            target['followers_list'].append(current_user)

        follower['following'] = len(follower['following_list'])
        target['followers'] = len(target['followers_list'])

        create_or_update_user_file(current_user, follower)
        create_or_update_user_file(username, target)
        return jsonify({"message": f"Now following {username}."})

    @app.route('/api/users/<username>/unfollow', methods=['POST'])
    def unfollow_user(username):
        current_user = session.get('username')
        if not current_user or current_user == username:
            return jsonify({"error": "Invalid action"}), 400

        target = get_user_file(username)
        follower = get_user_file(current_user)
        if not target or not follower:
            return jsonify({"error": "User not found"}), 404

        if username in follower['following_list']:
            follower['following_list'].remove(username)
        if current_user in target['followers_list']:
            target['followers_list'].remove(current_user)

        follower['following'] = len(follower['following_list'])
        target['followers'] = len(target['followers_list'])

        create_or_update_user_file(current_user, follower)
        create_or_update_user_file(username, target)
        return jsonify({"message": f"Unfollowed {username}."})
