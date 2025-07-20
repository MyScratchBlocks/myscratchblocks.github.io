import os
import base64
import json
import requests
from flask import Flask, request, jsonify, session, render_template
from werkzeug.security import generate_password_hash, check_password_hash

# --- GitHub API Configuration (from your provided code) ---
GH_KEY = os.getenv('GH_KEY')
GITHUB_REPO = "kRxZykRxZy/ScratchGems-MAIN"
GITHUB_BRANCH = "main"
DB_PATH = "db/myscratchblocks"
GH_API_URL = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{DB_PATH}?ref={GITHUB_BRANCH}"

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
# --- End GitHub API Configuration ---

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY') or 'supersecretkey123'

# --- API Endpoints (from your provided code) ---
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
        "profile_bio": "A passionate creator.", # Default bio
        "profile_pic_url": "https://placehold.co/120x120/a78bfa/ffffff?text=" + username[0].upper(), # Default avatar
        "discord_link": "#", # Placeholder
        "followers": 0,
        "following": 0,
        "totalProjects": 0, # Renamed from 'posts' for clarity
        "totalViews": 0,
        "totalLikes": 0,
        "totalFavorites": 0,
        "achievements": [],
        "created_at": ""
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

    user_data.pop('password', None)
    user_data.pop('_sha', None)
    session['user'] = user_data
    # Store username in session for client-side access (if needed, but local storage is used for current example)
    session['username'] = username

    return jsonify({"message": "Login successful", "user": user_data})

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    session.pop('username', None) # Clear username from session too
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
            user_data.pop('password', None)
            user_data.pop('_sha', None)
            users.append(user_data)
    return jsonify(users)

@app.route('/api/update_profile/<username>', methods=['PUT'])
def update_profile(username):
    # Ensure user is logged in and is the profile owner
    if 'user' not in session or session['user']['username'] != username:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    user_data = get_user_file(username)
    if not user_data:
        return jsonify({"error": "User not found"}), 404

    # Update only allowed fields
    user_data['profile_bio'] = data.get('profile_bio', user_data.get('profile_bio'))
    user_data['profile_pic_url'] = data.get('profile_pic_url', user_data.get('profile_pic_url'))
    user_data['discord_link'] = data.get('discord_link', user_data.get('discord_link'))
    # You might want to add other updatable fields here

    success = create_or_update_user_file(username, user_data)
    if not success:
        return jsonify({"error": "Failed to update profile"}), 500

    # Update session data as well
    session['user'] = user_data
    return jsonify({"message": "Profile updated successfully", "user": user_data})


# --- Frontend Route ---
@app.route('/users/<username>')
def user_profile_page(username):
    # In a real app, you would fetch the user_data from your GitHub backend here
    # and pass it to the template. For now, we'll let client-side JS handle it.
    # However, for initial render and SEO, it's better to pre-fetch on server.
    user_data = get_user_file(username)
    if not user_data:
        # Handle case where user does not exist
        return "User not found", 404

    # Remove sensitive data before passing to template
    user_data.pop('password', None)
    user_data.pop('_sha', None)

    # Check if the currently logged-in user is the owner
    is_owner = False
    if 'user' in session and session['user']['username'] == username:
        is_owner = True

    return render_template('user_page.html', profile_user=user_data, is_owner=is_owner, logged_in_username=session.get('username'))

@app.route('/')
def home():
    return "Welcome to MyScratchBlocks! Navigate to `/users/<username>` to view a profile."

if __name__ == '__main__':
    # Ensure you set the GH_KEY and FLASK_SECRET_KEY environment variables
    # For local testing:
    # os.environ['GH_KEY'] = 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN'
    # os.environ['FLASK_SECRET_KEY'] = 'a_very_secret_key_for_session_management'
    app.run(debug=True)
