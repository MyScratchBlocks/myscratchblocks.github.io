import os
import json
import base64
import requests
from flask import request, jsonify

def register_articles(app):
    GH_TOKEN = os.environ.get("GH_TOKEN")
    REPO = "The-Scratch-Channel/the-scratch-channel.github.io"
    BRANCH = "main"
    ARTICLES_PATH = "AUTOADDED-ARTICLES"
    API_BASE = "https://api.github.com"

    if not GH_TOKEN:
        raise RuntimeError("GH_TOKEN environment variable is not set")

    HEADERS = {
        "Authorization": f"token {GH_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }

    def get_file_sha(path):
        """Get SHA of file if it exists."""
        url = f"{API_BASE}/repos/{REPO}/contents/{path}?ref={BRANCH}"
        r = requests.get(url, headers=HEADERS)
        if r.status_code == 200:
            return r.json()["sha"]
        return None

    def get_file_content(path):
        """Get decoded content of a file from GitHub."""
        url = f"{API_BASE}/repos/{REPO}/contents/{path}?ref={BRANCH}"
        r = requests.get(url, headers=HEADERS)
        if r.status_code == 200:
            content_b64 = r.json()["content"]
            return base64.b64decode(content_b64).decode("utf-8")
        return None

    def update_file(path, content_str, message):
        """Create or update a file in GitHub."""
        sha = get_file_sha(path)
        url = f"{API_BASE}/repos/{REPO}/contents/{path}"
        data = {
            "message": message,
            "content": base64.b64encode(content_str.encode("utf-8")).decode("utf-8"),
            "branch": BRANCH
        }
        if sha:
            data["sha"] = sha
        r = requests.put(url, headers=HEADERS, json=data)
        if r.status_code not in (200, 201):
            raise RuntimeError(f"GitHub API error: {r.status_code} {r.text}")
        return r.json()

    @app.route('/the-scratch-channel/articles/create', methods=['POST'])
    def create_article():
        """Upload a new article and update index.json"""
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        content_raw = file.read().decode("utf-8").strip()

        # Load or create index
        index_path = f"{ARTICLES_PATH}/index.json"
        index_content = get_file_content(index_path)
        if index_content:
            try:
                index_data = json.loads(index_content)
            except Exception:
                index_data = []
        else:
            index_data = []

        # Determine next filename
        if index_data:
            try:
                numbers = [int(os.path.splitext(fname)[0]) for fname in index_data]
                next_number = max(numbers) + 1
            except Exception:
                next_number = 1
        else:
            next_number = 1
        filename = f"{next_number}.md"

        # Upload article file
        article_path = f"{ARTICLES_PATH}/{filename}"
        update_file(article_path, content_raw, f"Add article {filename}")

        # Update index (newest first)
        index_data.insert(0, filename)
        update_file(index_path, json.dumps(index_data, indent=2), "Update article index")

        return jsonify({"message": "Article uploaded successfully", "filename": filename})

    @app.route('/the-scratch-channel/articles/<articlename>', methods=['GET'])
    def get_article(articlename):
        """Get article content only if filename exists in index.json"""
        index_path = f"{ARTICLES_PATH}/index.json"
        index_content = get_file_content(index_path)
        if not index_content:
            return jsonify({"error": "Index not found"}), 404

        try:
            index_data = json.loads(index_content)
        except Exception as e:
            return jsonify({"error": f"Corrupted index.json: {str(e)}"}), 500

        if articlename not in index_data:
            return jsonify({"error": f"Article '{articlename}' not listed in index"}), 404

        # Load markdown content
        article_path = f"{ARTICLES_PATH}/{articlename}"
        file_content = get_file_content(article_path)
        if not file_content:
            return jsonify({"error": f"Article file '{articlename}' not found"}), 404

        return jsonify({
            "filename": articlename,
            "content": file_content
        })

    @app.route('/the-scratch-channel/articles/index.json', methods=['GET'])
    def get_articles_index():
        """Return index.json as a list of filenames"""
        content = get_file_content(f"{ARTICLES_PATH}/index.json")
        if not content:
            return jsonify([])
        try:
            return jsonify(json.loads(content))
        except Exception:
            return jsonify([])

    @app.route('/the-scratch-channel/articles/debug/index', methods=['GET'])
    def debug_index():
        """Debug endpoint: return raw index.json text"""
        content = get_file_content(f"{ARTICLES_PATH}/index.json")
        if not content:
            return "Index not found", 404
        return content, 200, {"Content-Type": "text/plain"}
