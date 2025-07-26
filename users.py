import os
import base64
import json
import uuid
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

    app.secret_key = os.getenv("SECRET_KEY", "dev-secret")

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
        user_projects = user_data.get("projects", [])
        filtered = [proj for proj in user_projects if proj.get("id") in available_ids]
        user_data["projects"] = filtered
        try:
            r = requests.get(f'https://editor-compiler.onrender.com/userapi/{user_data["username"]}')
            if r.status_code == 200:
                stats_data = r.json()
                user_data["stats"] = stats_data.get("stats", {})
            else:
                user_data["stats"] = {}
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
            "created_at": datetime.utcnow().isoformat(),
            "comments": []
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

    @app.route('/api/users/<username>/comment', methods=['POST'])
    def post_comment(username):
        if 'username' not in session:
            return jsonify({"error": "Login required"}), 401

        data = request.json
        text = data.get("text", "").strip()
        parent_id = data.get("parent_id")  # optional for replies

        if not text:
            return jsonify({"error": "Comment cannot be empty"}), 400

        profile = get_user_file(username)
        if not profile:
            return jsonify({"error": "User not found"}), 404

        comment = {
            "id": str(uuid.uuid4()),
            "author": session['username'],
            "text": text,
            "timestamp": datetime.utcnow().isoformat(),
            "replies": []
        }

        def insert_comment(comments_list, target_id):
            for c in comments_list:
                if c['id'] == target_id:
                    c['replies'].append(comment)
                    return True
                if insert_comment(c['replies'], target_id):
                    return True
            return False

        if parent_id:
            if not insert_comment(profile.get("comments", []), parent_id):
                return jsonify({"error": "Parent comment not found"}), 404
        else:
            profile.setdefault("comments", []).append(comment)

        if not create_or_update_user_file(username, profile):
            return jsonify({"error": "Failed to post comment"}), 500

        return jsonify({"message": "Comment posted"})

    @app.route('/users/<username>')
    def user_page(username):
        user_data = get_user_file(username)
        if not user_data:
            return "User not found", 404

        user_data = filter_user_projects(user_data)
        user_data.pop('password', None)
        user_data.pop('_sha', None)

        is_owner = session.get('username') == username

        def build_comment_tree(comments):
            def render(c):
                replies_html = "".join(render(reply) for reply in c.get("replies", []))
                author = c['author']
                return f"""
                <div class="comment">
                    <p><a href="/users/{author}">{author}</a>: {c['text']}</p>
                    <small>{c['timestamp']}</small>
                    {"<form method='post' action='/api/users/{0}/comment' class='reply-form'>\
                    <input name='text' placeholder='Reply' required>\
                    <input type='hidden' name='parent_id' value='{1}'><button type='submit'>Reply</button></form>".format(username, c['id']) if session.get('username') else ""}
                    <div class="replies">{replies_html}</div>
                </div>
                """
            return "".join(render(c) for c in comments)

        comments_html = build_comment_tree(user_data.get("comments", []))

        return render_template('user_page.html', profile_user=user_data, is_owner=is_owner, comments_html=comments_html)

    # Other routes (edit, follow, unfollow, etc.) remain unchanged
    @app.route('/api/profile')
    def profile():
        return jsonify(session)
