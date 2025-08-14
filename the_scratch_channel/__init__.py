import os
import json
import re
import base64
import requests
from flask import request, jsonify

def register_articles(app):
    GH_TOKEN = os.environ.get("GH_TOKEN")
    REPO = "MyScratchBlocks/myscratchblocks.github.io"
    BRANCH = "main"
    ARTICLES_PATH = "scratch-channel/articles"
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
        """Get decoded content of a file."""
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
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        filename = file.filename
        article_name = os.path.splitext(filename)[0]
        file_content = file.read().decode("utf-8")

        # Upload article markdown
        article_path = f"{ARTICLES_PATH}/{filename}"
        update_file(article_path, file_content, f"Add article {filename}")

        # Update index.json
        index_path = f"{ARTICLES_PATH}/index.json"
        index_content = get_file_content(index_path)
        if index_content:
            index_data = json.loads(index_content)
        else:
            index_data = []

        if article_name not in index_data:
            index_data.insert(0, article_name)
            update_file(index_path, json.dumps(index_data, indent=2), "Update article index")

        return jsonify({"message": "Article uploaded successfully", "filename": filename})

    @app.route('/the-scratch-channel/articles/<articlename>.md', methods=['GET'])
    def get_article_metadata(articlename):
        article_path = f"{ARTICLES_PATH}/{articlename}.md"
        file_content = get_file_content(article_path)
        if not file_content:
            return jsonify({"error": "Article not found"}), 404

        # Extract metadata table
        match = re.search(r"\| *(.+?) *\| *(.+?) *\| *(.+?) *\|", file_content)
        if not match:
            return jsonify({"error": "Metadata not found"}), 400

        title, author, date = match.groups()

        return jsonify({
            "title": title.strip(),
            "author": author.strip(),
            "date": date.strip()
        })

    @app.route('/the-scratch-channel/articles/index.json', methods=['GET'])
    def get_articles_index():
        index_path = f"{ARTICLES_PATH}/index.json"
        content = get_file_content(index_path)
        if not content:
            return jsonify([])
        return jsonify(json.loads(content))
