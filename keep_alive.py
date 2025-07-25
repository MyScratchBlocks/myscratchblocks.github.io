from flask import *
from threading import Thread
from datetime import datetime
from io import BytesIO
import os, base64, requests, zipfile
from projects import register_routes
from editor import register
from users import register_login

app = Flask(__name__)
register_routes(app)
register(app)
register_login(app)
app.secret_key = 'a9f3d7c0e1b24f6d9e8a5c3b7f1d2e0c'
GITHUB_USER = 'MyScratchBlocks'
REPO_NAME = 'Project-DB'
GITHUB_API_BASE = f'https://api.github.com/repos/{GITHUB_USER}/{REPO_NAME}/contents'
GITHUB_TOKEN_PRIMARY = os.getenv('GH_KEY')
GITHUB_TOKEN_FALLBACK = os.getenv('GH_TOKEN_V')

if not GITHUB_TOKEN_PRIMARY:
    raise EnvironmentError("Missing GH_KEY environment variable.")

current_token = GITHUB_TOKEN_PRIMARY
upload_logs = []  # ✅ log list

def log_upload(message, level="info"):
    timestamp = datetime.utcnow().isoformat()
    upload_logs.append({"timestamp": timestamp, "level": level, "message": message})
    print(f"[{level.upper()}] {timestamp} - {message}")

def switch_token():
    global current_token
    if current_token == GITHUB_TOKEN_PRIMARY and GITHUB_TOKEN_FALLBACK:
        current_token = GITHUB_TOKEN_FALLBACK
    else:
        current_token = GITHUB_TOKEN_PRIMARY

def gh_request(method, url, **kwargs):
    global current_token
    headers = kwargs.get('headers', {}).copy()
    headers['Authorization'] = f'token {current_token}'
    headers['Accept'] = 'application/vnd.github+json'
    kwargs['headers'] = headers

    response = requests.request(method, url, **kwargs)
    if response.status_code != 403:
        return response

    switch_token()
    headers['Authorization'] = f'token {current_token}'
    kwargs['headers'] = headers
    return requests.request(method, url, **kwargs)

def upload_file_to_github(file_storage, tag="general"):
    filename = file_storage.filename
    file_contents = file_storage.read()
    encoded = base64.b64encode(file_contents).decode('utf-8')
    api_url = f"{GITHUB_API_BASE}/{filename}"

    existing = gh_request('get', api_url)
    sha = existing.json().get('sha') if existing.status_code == 200 else None

    payload = {
        "message": f"Upload {filename} at {datetime.utcnow().isoformat()}",
        "content": encoded,
        "branch": "main"
    }
    if sha:
        payload['sha'] = sha

    response = gh_request('put', api_url, json=payload)
    if response.status_code in [200, 201]:
        log_upload(f"[{tag}] Uploaded {filename} successfully.")
        return True
    else:
        log_upload(f"[{tag}] Failed to upload {filename}: {response.text}", level="error")
        return False

@app.route('/upload/compiler', methods=['POST'])
def upload_files():
    if 'file' not in request.files:
        return jsonify({"error": "No files in request"}), 400

    files = request.files.getlist('file')
    if not files:
        return jsonify({"error": "No files uploaded"}), 400

    results = []
    for item in files:
        if not item or item.filename == '':
            results.append({"filename": None, "status": "skipped - no filename"})
            continue

        ext = os.path.splitext(item.filename)[1].lower()
        tag = "sb3" if ext == '.sb3' else "asset"

        success = upload_file_to_github(item, tag=tag)
        results.append({
            "filename": item.filename,
            "status": "uploaded" if success else "failed",
            "type": tag
        })

    return jsonify({"results": results})

@app.route('/uploads/files', methods=['GET'])
def download_zipped_uploads():
    memory_file = BytesIO()

    try:
        github_list_resp = gh_request('get', GITHUB_API_BASE)
        github_list = github_list_resp.json()

        if isinstance(github_list, dict) and github_list.get("message"):
            return jsonify({"error": github_list["message"]}), 500

        with zipfile.ZipFile(memory_file, 'w') as zipf:
            for file_info in github_list:
                name = file_info.get('name', '')
                if name and file_info.get('url'):
                    file_api_url = file_info['url']
                    file_data_resp = gh_request('get', file_api_url)
                    file_data = file_data_resp.json()

                    encoding = file_data.get('encoding')
                    content = file_data.get('content')

                    if encoding == 'base64' and content:
                        decoded = base64.b64decode(content)
                        zipf.writestr(name, decoded)
                    else:
                        log_upload(f"Skipped {name}: encoding={encoding}", level="warn")

        memory_file.seek(0)
        return send_file(
            memory_file,
            download_name='uploads.zip',
            as_attachment=True,
            mimetype='application/zip'
        )

    except Exception as e:
        log_upload(f"Error creating zip: {str(e)}", level="error")
        return jsonify({"error": str(e)}), 500

@app.route('/contents', methods=['GET'])
def list_sb3_files_in_zip():
    try:
        # Fetch all files from the GitHub repo
        github_list_resp = gh_request('get', GITHUB_API_BASE)
        github_list = github_list_resp.json()

        if isinstance(github_list, dict) and github_list.get("message"):
            return jsonify({"error": github_list["message"]}), 500

        sb3_filenames = []

        for file_info in github_list:
            name = file_info.get('name', '')
            if not name.lower().endswith('.zip'):
                continue  # only examine ZIP files

            file_api_url = file_info['url']
            file_data_resp = gh_request('get', file_api_url)
            file_data = file_data_resp.json()

            encoding = file_data.get('encoding')
            content = file_data.get('content')

            if encoding != 'base64' or not content:
                continue

            decoded = base64.b64decode(content)

            with zipfile.ZipFile(BytesIO(decoded), 'r') as zipf:
                for zip_info in zipf.infolist():
                    if zip_info.filename.lower().endswith('.sb3'):
                        sb3_filenames.append(zip_info.filename)

        if not sb3_filenames:
            return jsonify({"message": "No .sb3 files found in recent ZIPs."}), 404

        return jsonify({"sb3_files": sb3_filenames})

    except Exception as e:
        log_upload(f"Error listing .sb3 files: {str(e)}", level="error")
        return jsonify({"error": str(e)}), 500

@app.route('/status', methods=['GET'])
def status():
    return jsonify({"logs": upload_logs})

@app.route('/<path:path>')
def serve_index(path):
    # Sanitize and serve the file directly from the current directory
    if not path.endswith('.html'):
        path += '.html'
    return send_from_directory(os.getcwd(), path)

@app.errorhandler(404)
def notfound(e):
    return send_from_directory(os.getcwd(), '404.html')
    
# Optional: add a root route
@app.route('/')
def index():
    return send_from_directory(os.getcwd(), 'index.html')
    
def run():
    app.run(host='0.0.0.0')

def keep_alive():
    t = Thread(target=run)
    t.start()
