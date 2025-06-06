const express = require('express');
const router = express.Router();

router.get('/projects/:id', (req, res) => {
  const { id } = req.params;
  res.send(`
<DOCTYPE html>
<html lang="en">
<head>
  <script src="https://kit.fontawesome.com/1373677f05.js" crossorigin="anonymous"></script>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>MyScratchBlocks - Project Viewer</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    body {
      font-family: 'Inter', sans-serif;
      background-color: #f8fafc;
      color: #334155;
    }
    iframe {
      border: 8px solid #0c99d5;
      border-radius: 12px;
      box-shadow: 0 6px 12px rgba(12, 153, 213, 0.5);
      width: 100%;
      height: 600px;
      background: #e0f7fa;
    }
    .modal {
      display: none;
      position: fixed;
      z-index: 50;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.6);
      align-items: center;
      justify-content: center;
    }
    .modal-content {
      background-color: white;
      padding: 2rem;
      border-radius: 0.5rem;
      text-align: center;
      max-width: 90%;
      width: 400px;
    }
    .disabled-btn {
      opacity: 0.5;
      pointer-events: none;
    }
  </style>
</head>
<body class="antialiased">
  <header class="bg-white shadow-sm py-4">
    <div class="container mx-auto px-4 flex justify-between items-center">
      <a href="#" class="flex items-center space-x-2 text-2xl font-bold text-indigo-600">
        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-6h-2v6zm0-8h2V7h-2v2z"/>
        </svg>
        <span>MyScratchBlocks</span>
      </a>
      <nav class="hidden md:flex space-x-6">
        <a href="/" class="text-gray-600 hover:text-indigo-600 font-medium">Home</a>
        <a href="/#features" class="text-gray-600 hover:text-indigo-600 font-medium">Features</a>
        <a href="/#block-ideas" class="text-gray-600 hover:text-indigo-600 font-medium">Block Ideas</a>
        <a href="/#project-ideas" class="text-gray-600 hover:text-indigo-600 font-medium">Project Ideas</a>
        <a href="/#featured-projects" class="text-gray-600 hover:text-indigo-600 font-medium">Featured Projects</a>
        <a href="/#access" class="text-gray-600 hover:text-indigo-600 font-medium">Access</a>
        <a href="/#community" class="text-gray-600 hover:text-indigo-600 font-medium">Community</a>
        <a href="/#about" class="text-gray-600 hover:text-indigo-600 font-medium">About</a>
        <a id="account" href="/account" class="text-gray-600 hover:text-indigo-600 font-medium">Account</a>
      </nav>
    </div>
  </header>

  <section id="featured-projects" class="py-16 bg-gray-100">
    <div class="container mx-auto px-4">
      <iframe id="id-frame" src="#" class="mb-6"></iframe>

      <div id="project-meta" class="bg-white p-6 rounded-lg shadow-md">
        <div id="meta-loading" class="text-sm text-gray-500">Loading project metadata...</div>
        <div id="meta-error" class="hidden text-sm text-red-600">Failed to load metadata.</div>
        <div id="meta-content" class="hidden">
          <h2 class="text-2xl font-bold text-indigo-700 mb-2" id="meta-title"></h2>
          <p class="text-gray-700 mb-4" id="meta-description"></p>
          <p class="text-gray-600 mb-4" id="meta-instructions"></p>

          <div class="mb-4">
            <p class="text-sm text-gray-500"><strong>Main Coder:</strong> <span id="meta-author"></span></p>
            <p class="text-sm text-gray-500"><strong>Created:</strong> <span id="meta-date"></span></p>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center mb-4">
            <div>
              <i class="fa-solid fa-eye" style="color: #63E6BE;"></i>
              <p class="text-lg font-semibold text-indigo-600" id="meta-views">0</p>
              <p class="text-sm text-gray-500">Views</p>
            </div>
            <div>
              <i class="fa-solid fa-arrow-up" style="color: #63E6BE;"></i>
              <p class="text-lg font-semibold text-blue-600" id="meta-loves">0</p>
              <p class="text-sm text-gray-500">Upvotes</p>
            </div>
            <div>
              <i class="fa-solid fa-star" style="color: #63E6BE;"></i>
              <p class="text-lg font-semibold text-yellow-500" id="meta-favorites">0</p>
              <p class="text-sm text-gray-500">Favorites</p>
            </div>
            <div>
              <i class="fa-solid fa-circle" style="color: #63E6BE;"></i>
              <p class="text-lg font-semibold text-green-600" id="meta-remixes">0</p>
              <p class="text-sm text-gray-500">Remixes</p>
            </div>
          </div>

          <div id="action-buttons" class="flex gap-4">
            <button id="like-btn" class="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg">
              <i class="fa-solid fa-arrow-up mr-2"></i> Upvote
            </button>
            <button id="fav-btn" class="px-4 py-2 bg-yellow-400 text-white font-semibold rounded-lg">
              <i class="fa-solid fa-star mr-2"></i> Favourite
            </button>
          </div>

          <!-- Added See Inside button -->
          <div class="mt-4">
            <button id="see-inside-btn" class="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg">
              <i class="fa-solid fa-code mr-2"></i> See Inside
            </button>
            <button id="remix-btn" class="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg">
              <i class="fa-solid fa-code mr-2"></i> Remix
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
  
  <section id="comments-section" class="mt-12 bg-white p-6 rounded-lg shadow-md max-w-3xl mx-auto">
  <h3 class="text-xl font-semibold mb-4 text-indigo-700"><i class="fa-solid fa-comments mr-2"></i> Comments</h3>
  
  <div id="comments-list" class="space-y-6">
    <p id="comments-loading" class="text-gray-500">Loading comments...</p>
    <p id="comments-error" class="hidden text-red-600">Failed to load comments.</p>
  </div>
  
  <form id="comment-form" class="mt-8">
    <textarea id="comment-input" rows="3" placeholder="Add a comment..." required
      class="w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
    <button type="submit"
      class="mt-2 px-5 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
      id="comment-submit"><i class="fa-solid fa-plus mr-2"></i> Post Comment</button>
  </form>
</section>

  <!-- Login Required Modal -->
  <div id="login-modal" class="modal flex">
    <div class="modal-content">
      <h2 class="text-xl font-bold text-red-600 mb-4">Login Required</h2>
      <p class="mb-4">You need to be logged in to use this feature.</p>
      <a href="/account" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">Go to Login</a>
      <a onclick="closeLoginModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">Close</a>
    </div>
  </div>

  <script>
    closeLoginModal();
    const id = window.location.hash.slice(1);
    const iframe = document.getElementById('id-frame');
    const remix = document.getElementById('remix-btn');
    remix.addEventListener('click', async () => {
      if(!localStorage.getItem('username')) {
        showModal();
      } else {
        window.location.href = `editor?remix=${id}`;
      }
    });
    iframe.src = `https://myscratchblocks.github.io/scratch-gui/embed#${id}`;
    const loginModal = document.getElementById('login-modal');
    loginModal.style.display = 'none';

    function showModal() {
      const loginModal = document.getElementById('login-modal');
      loginModal.style.display = 'flex';
      setTimeout(() => loginModal.style.display = 'none', 3000);
    }

    async function fetchMeta() {
      const loading = document.getElementById('meta-loading');
      const error = document.getElementById('meta-error');
      const content = document.getElementById('meta-content');

      try {
        const res = await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/meta`);
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        const meta = await res.json();
        
        if(meta.author?.username === localStorage.getItem('username')) {
          document.getElementById('see-inside-btn').textContent = 'Edit Project';
         } 

        document.getElementById('meta-title').textContent = meta.title || 'Untitled Project';
        document.title = meta.title || 'Untitled Project';
        document.getElementById('meta-description').textContent = meta.description || 'No description.';
        document.getElementById('meta-instructions').textContent = meta.instructions || '';
        document.getElementById('meta-author').textContent = meta.author?.username || 'Unknown';
        document.getElementById('meta-date').textContent = new Date(meta.history?.created).toLocaleDateString();

        document.getElementById('meta-views').textContent = meta.stats?.views ?? 1;
        document.getElementById('meta-loves').textContent = meta.stats?.loves ?? 0;
        document.getElementById('meta-favorites').textContent = meta.stats?.favorites ?? 0;
        document.getElementById('meta-remixes').textContent = meta.stats?.remixes ?? 0;

        loading.classList.add('hidden');
        content.classList.remove('hidden');
      } catch (err) {
        loading.classList.add('hidden');
        error.classList.remove('hidden');
      }
    }

    function closeLoginModal() {
      const loginModal = document.getElementById('login-modal');
      loginModal.style.display = 'none';
    }

    window.onload = async () => {
      fetchMeta();

      const username = localStorage.getItem('username');
      if (username) {
        const acc = document.getElementById('account');
        if (acc) acc.textContent = username;

        // Send view only if logged in
        const viewKey = `viewed_${id}`;
        const today = new Date().toISOString().slice(0, 10);
        const lastViewed = localStorage.getItem(viewKey);
        if (lastViewed !== today) {
          try {
            await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/view`, { method: 'POST' });
            localStorage.setItem(viewKey, today);
            window.location.reload();
          } catch {
            // Ignore errors silently
          }
        }
      }

      // Like button logic
      document.getElementById('like-btn').addEventListener('click', async () => {
        if (!localStorage.getItem('username')) return showModal();

        const likedKey = `liked_${id}`;
        if (localStorage.getItem(likedKey)) {
          window.location.reload();
          return;
        }
        try {
          const res = await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/like`, { method: 'POST' });
          if (res.ok) {
            let countEl = document.getElementById('meta-loves');
            countEl.textContent = Number(countEl.textContent) + 1;
            localStorage.setItem(likedKey, 'true');
            window.location.reload();
          }
        } catch (err) {
          window.location.href = window.location.pathname + window.location.hash;
        }
      });

      // Favorite button logic
      document.getElementById('fav-btn').addEventListener('click', async () => {
        if (!localStorage.getItem('username')) return showModal();

        const favKey = `favorited_${id}`;
        if (localStorage.getItem(favKey)) {
          window.location.href = window.location.pathname + window.location.hash;
          return;
        }
        try {
          const res = await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/favorite`, { method: 'POST' });
          if (res.ok) {
            let countEl = document.getElementById('meta-favorites');
            countEl.textContent = Number(countEl.textContent) + 1;
            localStorage.setItem(favKey, 'true');
            window.location.href = window.location.pathname + window.location.hash;
          }
        } catch (err) {
          alert('Failed to favourite project.');
        }
      });

      document.getElementById('see-inside-btn').addEventListener('click', () => {
        window.location.href = `editor#${window.location.hash.substring(1)}`;
      });
      
      // Comments logic
      const commentsList = document.getElementById('comments-list');
      const commentsLoading = document.getElementById('comments-loading');
      const commentsError = document.getElementById('comments-error');
      const commentForm = document.getElementById('comment-form');
      const commentInput = document.getElementById('comment-input');
      const commentSubmit = document.getElementById('comment-submit');

      async function fetchComments() {
        try {
          const res = await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/comments`);
          if (!res.ok) throw new Error('Failed to fetch comments');
          const comments = await res.json();

          commentsLoading.style.display = 'none';
          commentsError.classList.add('hidden');

          commentsList.innerHTML = '';
          comments.forEach(c => {
            const div = document.createElement('div');
            div.className = 'border rounded p-3 bg-gray-50';
            div.innerHTML = `<p class="font-semibold text-indigo-700">${c.user}</p><p>${c.text}</p>`;
            commentsList.appendChild(div);
          });
        } catch {
          commentsLoading.style.display = 'none';
          commentsError.classList.remove('hidden');
        }
      }

      fetchComments();

      commentForm.addEventListener('submit', async e => {
        e.preventDefault();
        if (!localStorage.getItem('username')) return showModal();

        const commentText = commentInput.value.trim();
        if (!commentText) return;

        commentSubmit.disabled = true;
        try {
          const res = await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: commentText, username: localStorage.getItem('username') })
          });
          if (!res.ok) throw new Error(res.error);

          commentInput.value = '';
          fetchComments();
        } catch {
          alert(res.error);
        }
        commentSubmit.disabled = false;
      });
    };
  </script>
</body>
</html>`) 
