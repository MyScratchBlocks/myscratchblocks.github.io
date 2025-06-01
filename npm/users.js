const express = require('express');
const router = express.Router();

router.get('/users/:username', (req, res) => {
  const username = req.params.username;

  return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>User Profile - MyScratchBlocks - A Scratch & TurboWarp Modification</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      font-family: 'Inter', sans-serif;
      background-color: #f8fafc;
      color: #334155;
    }
    header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10;
      background: white;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      height: 56px;
      display: flex;
      align-items: center;
    }
    header > div {
      width: 100%;
      max-width: 1024px;
      margin: 0 auto;
      padding: 0 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .loading-spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 1s linear infinite;
      display: inline-block;
      vertical-align: middle;
      margin-left: 8px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    iframe {
      position: fixed;
      top: 56px;
      left: 0;
      width: 100vw;
      height: calc(100vh - 56px);
      border: none;
      display: block;
    }
  </style>
</head>
<body class="antialiased">
  <header>
    <div>
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
        <a id="account" href="account" class="text-gray-600 hover:text-indigo-600 font-medium">Login</a>
      </nav>
    </div>
  </header>

  <iframe id="iframe" src="https://editor-compiler.onrender.com/users/${username}"></iframe>
</body>
</html>`);
});

module.exports = router;
