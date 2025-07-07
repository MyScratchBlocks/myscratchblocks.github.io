  // get modal elements 
  const reportModal = document.getElementById('id01');
  const loginModal = document.getElementById('login-modal');
  reportModal.style.display = 'none';
  loginModal.style.display = 'none';

  // Extract project ID from URL hash
  const hash = window.location.hash.substring(1); 
  const id = hash.split('?')[0];

  // Set iframe source to embed Scratch GUI with project ID
  const iframe = document.getElementById('id-frame');
  const remix = document.getElementById('remix-btn');
  iframe.src = `https://myscratchblocks.github.io/scratch-gui/embed#${id}`;

  // Show/hide login modal
  function closeLoginModal() {
    loginModal.style.display = 'none';
  }
  function showLoginModal() {
    loginModal.style.display = 'flex';
  }

  // Fetch and display project metadata (title, description, author, stats, etc)
  async function fetchMeta() {
    const loading = document.getElementById('meta-loading');
    const error = document.getElementById('meta-error');
    const content = document.getElementById('meta-content');
    const metaTitleElement = document.getElementById('meta-title');
    const editableTitleInput = document.getElementById('editable-title');
    const metaDescriptionElement = document.getElementById('meta-description');
    const editableDescriptionTextarea = document.getElementById('editable-description');
    const metaAuthorElement = document.getElementById('meta-author');
    const seeInsideBtn = document.getElementById('see-inside-btn');
    const saveChangesBtn = document.getElementById('save-changes-btn');
    const shareProjectBtn = document.getElementById('share-project-btn');
    const shareProjectAlert = document.getElementById('share-project-btn2');
    const elem = document.getElementById('change-main-coder-btn');

    const currentUsername = localStorage.getItem('username') || 'MyScratchBlocks-1312';
    if (!id) return;

    try {
      const res = await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/meta/${currentUsername}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': currentUsername
        }
      });

      if (!res.ok) throw new Error(await res.text());

      const meta = await res.json();
      const isOwner = meta.author?.username === currentUsername;
      const el = document.getElementById('change-main-coder-btn');
      if(isOwner) {
        el.classList.remove('hidden-by-js');
      } 
      metaTitleElement.textContent = meta.title || 'Untitled Project';
      editableTitleInput.value = meta.title || '';
      document.title = meta.title || 'Untitled Project';

      metaDescriptionElement.textContent = meta.description || 'No description.';
      editableDescriptionTextarea.value = meta.description || '';

      document.getElementById('meta-instructions').textContent = meta.instructions || '';
      document.getElementById('meta-date').textContent = new Date(meta.history?.created).toLocaleDateString();
      document.getElementById('meta-views').textContent = meta.stats?.views ?? 1;
      document.getElementById('meta-loves').textContent = meta.stats?.loves ?? 0;
      document.getElementById('meta-favorites').textContent = meta.stats?.favorites ?? 0;
      document.getElementById('meta-remixes').textContent = meta.stats?.remixes ?? 0;

      metaAuthorElement.textContent = isOwner ? 'This is you!' : (meta.author?.username || 'No One');
      seeInsideBtn.innerHTML = isOwner
        ? '<i class="fa-solid fa-pen-to-square mr-2"></i> Edit Project'
        : '<i class="fa-solid fa-code mr-2"></i> See Inside';

      if (isOwner) {
        metaTitleElement.classList.add('hidden-by-js');
        elem.classList.remove('hidden-by-js');
        editableTitleInput.classList.remove('hidden-by-js');
        metaDescriptionElement.classList.add('hidden-by-js');
        editableDescriptionTextarea.classList.remove('hidden-by-js');
        saveChangesBtn.classList.remove('hidden-by-js');

        if (meta.visibility === 'unshared') {
          shareProjectBtn.classList.remove('hidden-by-js');
          shareProjectAlert.classList.remove('hidden');
          shareProjectAlert.style.display = 'block';
        }

        if (!saveChangesBtn.dataset.listenerAttached) {
          saveChangesBtn.addEventListener('click', async () => {
            const updatedTitle = editableTitleInput.value.trim();
            const updatedDescription = editableDescriptionTextarea.value.trim();

            if (!updatedTitle) return alert('Title is required');

            try {
              const saveRes = await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/meta`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': currentUsername
                },
                body: JSON.stringify({
                  title: updatedTitle,
                  description: updatedDescription
                })
              });

              if (saveRes.ok) {
                alert('Saved successfully!');
                fetchMeta();
              } else {
                alert(await saveRes.text());
              }
            } catch (err) {
              alert('Failed to save project details.');
            }
          });
          saveChangesBtn.dataset.listenerAttached = true;
        }

        if (!shareProjectBtn.dataset.listenerAttached) {
          shareProjectBtn.addEventListener('click', async () => {
            if (!confirm("Are you sure you want to share this project?")) return;
            try {
              const shareRes = await fetch(`https://editor-compiler.onrender.com/api/share/${id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': currentUsername
                }
              });
              if (shareRes.ok) {
                alert('Project shared!');
                fetchMeta();
              } else {
                alert(await shareRes.text());
              }
            } catch (err) {
              alert('Error sharing project.');
            }
          });
          shareProjectBtn.dataset.listenerAttached = true;
        }
      } else {
        metaTitleElement.classList.remove('hidden-by-js');
        editableTitleInput.classList.add('hidden-by-js');
        metaDescriptionElement.classList.remove('hidden-by-js');
        editableDescriptionTextarea.classList.add('hidden-by-js');
        saveChangesBtn.classList.add('hidden-by-js');
        shareProjectBtn.classList.add('hidden-by-js');
        shareProjectAlert.classList.add('hidden');
        shareProjectAlert.style.display = 'none';
      }

      loading.classList.add('hidden');
      content.classList.remove('hidden');
      error.classList.add('hidden');
    } catch (err) {
      console.error('fetchMeta error:', err);
      error.textContent = `Could not load project info. Error: ${err.message}`;
      error.classList.remove('hidden');
      loading.classList.add('hidden');
      content.classList.add('hidden');
    }
  }

  // ========== COMMENTS FUNCTIONALITY ==========

  const baseUrl = 'https://editor-compiler.onrender.com';

  const commentsListContainer = document.getElementById('comments-list');
  const commentsLoading = document.getElementById('comments-loading');
  const commentsError = document.getElementById('comments-error');
  const commentForm = document.getElementById('comment-form');
  const commentInput = document.getElementById('comment-input');
  const commentSubmitBtn = document.getElementById('comment-submit');

function reverseData(data) {
  if (!Array.isArray(data)) {
    throw new Error("Input must be an array.");
  }

  // Optionally clone to avoid mutating original
  return data.slice().reverse();
}

  // Fetch comments
  async function fetchComments() {
    commentsLoading.classList.remove('hidden');
    commentsError.classList.add('hidden');
    commentsListContainer.innerHTML = ''; // Clear existing comments

    try {
      const response = await fetch(`${baseUrl}/${id}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      const comments = await response.json();
      displayComments(reverseData(comments));
    } catch (error) {
      console.error('Error fetching comments:', error);
      commentsError.textContent = 'Failed to load comments. Please try again later.';
      commentsError.classList.remove('hidden');
    } finally {
      commentsLoading.classList.add('hidden');
    }
  }

  // Post a new top-level comment
  async function postNewComment(text) {
    const username = localStorage.getItem('username');
    if (!username) {
      showLoginModal();
      return;
    }

    try {
      commentSubmitBtn.disabled = true; // Disable button to prevent double submission
      commentSubmitBtn.textContent = 'Posting...';
      const res = await fetch(`${baseUrl}/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          user: { username }
        })
      });
      const json2 = res.json();
      if (res.ok) {
        commentInput.value = ''; // Clear input
        await fetchComments(); // Refresh comments
      } else {
        alert(json2.error);
      }
    } catch (err) {
      console.error('Comment post error:', err);
      alert(json2.error);
    } finally {
      commentSubmitBtn.disabled = false; // Re-enable button
      commentSubmitBtn.innerHTML = '<i class="fa-solid fa-plus mr-2"></i> Post Comment';
    }
  }

  // Post a reply to an existing comment/reply
  async function postReply(commentId, text, formElement) {
    const username = localStorage.getItem('username');
    if (!username) {
      showLoginModal();
      return;
    }

    try {
      const replySubmitBtn = formElement.querySelector('.reply-button');
      if (replySubmitBtn) {
        replySubmitBtn.disabled = true; // Disable button
        replySubmitBtn.textContent = 'Posting Reply...';
      }

      const res = await fetch(`${baseUrl}/${id}/comments/${commentId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          user: { username }
        })
      });
      const json3 = res.json();
      if (res.ok) {
        formElement.remove(); // Remove the reply form
        await fetchComments(); // Refresh comments
      } else {
        alert(json3.error);
      }
    } catch (err) {
      console.error('Reply post error:', err);
      alert(json3.error);
    } finally {
      if (formElement.querySelector('.reply-button')) {
        formElement.querySelector('.reply-button').disabled = false;
        formElement.querySelector('.reply-button').textContent = 'Post Reply';
      }
    }
  }

  // Show reply form under a comment or reply
  function showReplyForm(parentCommentElement, commentId) {
    // Check if a reply form already exists for this comment/reply
    let existingForm = parentCommentElement.querySelector('.reply-form');

    if (existingForm) {
      // Toggle visibility if it exists
      existingForm.style.display = existingForm.style.display === 'none' ? 'block' : 'none';
      existingForm.querySelector('.reply-textarea').focus(); // Focus on textarea when showing
      return;
    }

    const form = document.createElement('form');
    form.className = 'reply-form';
    form.style.display = 'block'; // Ensure it's visible when created

    const textarea = document.createElement('textarea');
    textarea.className = 'reply-textarea'; // Apply styles from your CSS
    textarea.placeholder = 'Write your reply here...';
    textarea.required = true;
    form.appendChild(textarea);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'reply-button'; // Apply styles from your CSS
    submitBtn.textContent = 'Post Reply';
    form.appendChild(submitBtn);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = textarea.value.trim();
      if (!text) return alert('Reply text cannot be empty.');
      await postReply(commentId, text, form);
    });

    parentCommentElement.appendChild(form);
    textarea.focus(); // Focus on the new textarea
  }

  // Display all comments recursively
  function displayComments(comments) {
    commentsListContainer.innerHTML = ''; // Clear existing comments

    if (comments.length === 0) {
      commentsListContainer.innerHTML = '<p class="text-gray-500">No comments yet. Be the first to comment!</p>';
      return;
    }

    comments.forEach(comment => {
      const commentEl = createCommentElement(comment);
      commentsListContainer.appendChild(commentEl);
    });
  }

function createCommentElement(comment, depth = 0) {
    // Ensure `user` is treated consistently (object or string)
    const username = typeof comment.user === 'string' ? comment.user : (comment.user?.username || 'Anonymous');

    const commentItemDiv = document.createElement('div');
    commentItemDiv.className = 'comment-item'; // Base comment styling

    // Apply indentation and border for replies.
    // Indent only if it's a reply (depth > 0), but use a fixed indentation for all replies
    // regardless of their nesting level.
    if (depth > 0) {
      commentItemDiv.style.marginLeft = '3rem'; // Fixed indentation for all
      commentItemDiv.style.marginTop = '1rem'; // Space out nested replies
    }

    const authorDiv = document.createElement('div');
    authorDiv.className = 'comment-author';
    authorDiv.textContent = username;
    commentItemDiv.appendChild(authorDiv);

    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'comment-timestamp';
    timestampDiv.textContent = new Date(comment.createdAt).toLocaleString();
    commentItemDiv.appendChild(timestampDiv);

    const textP = document.createElement('p');
    textP.className = 'comment-text';
    // Use github-md tag for markdown rendering
    const markdownTag = document.createElement('github-md');
    markdownTag.innerHTML = comment.text; // Inner HTML to allow Markdown
    textP.appendChild(markdownTag);
    commentItemDiv.appendChild(textP);

    const replyBtn = document.createElement('button');
    replyBtn.className = 'reply-button';
    replyBtn.textContent = 'Reply';
    // Store the comment ID directly on the button using a data attribute
    replyBtn.dataset.commentId = comment.id;
    commentItemDiv.appendChild(replyBtn);

    // Container for nested replies (this is where recursive calls will append)
    const repliesContainerDiv = document.createElement('div');
    repliesContainerDiv.className = 'replies-container';
    commentItemDiv.appendChild(repliesContainerDiv);

    // Recursively render replies
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.forEach(reply => {
        // When rendering a reply, always pass '1' for the depth.
        // This ensures that all replies (first-level or replies to replies)
        // receive the same single level of indentation.
        const replyEl = createCommentElement(reply, 1);
        repliesContainerDiv.appendChild(replyEl);
      });
    }

    return commentItemDiv;
}

  // Event listener for the main comment submission form
  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = commentInput.value.trim();
    if (!text) return alert('Comment cannot be empty.');
    await postNewComment(text);
  });

  // Event delegation for reply buttons
  // Attach a single click listener to the parent container (commentsListContainer)
  // This listener will catch clicks on any .reply-button, even if dynamically added.
  commentsListContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('reply-button')) {
      const commentId = e.target.dataset.commentId; // Get the comment ID from the data attribute
      // Find the closest ancestor with class 'comment-item' to append the reply form to
      const parentCommentElement = e.target.closest('.comment-item');
      if (parentCommentElement && commentId) {
        showReplyForm(parentCommentElement, commentId);
      }
    }
  });


  window.onload = async () => {
    const username = localStorage.getItem('username');

    if (username) {
      document.getElementById('account').textContent = username;
      try {
        await fetch(`https://editor-compiler.onrender.com/api/${id}/views/${username}`, { method: 'POST' });
      } catch (err) {
        console.warn("Failed to record view:", err);
      }
    }

    // Fetch metadata and comments on page load
    await fetchMeta();
    await fetchComments(); // Initial fetch of comments
    await fetchAds();

    async function fetchAds() { // This function was missing its closing brace!
      try {
        const res = await fetch('https://editor-compiler.onrender.com/ad/random');
        if (!res.ok) { // Check if the first response was successful
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();

        // Ensure data.ad exists and is a string before attempting replace
        if (!data.ad || typeof data.ad !== 'string') {
          console.warn("Unexpected ad format received:", data.ad);
          fetchAds(); // Retry if ad format is unexpected
          return;
        }

        const adId = data.ad.replace('ad:', '');

        // It seems you're trying to re-fetch if the adId is '21'.
        // If '21' is a specific ID you want to exclude, this logic is fine.
        // However, if '21' is meant to be a status code or a different kind of flag,
        // you might need to adjust the condition. Assuming '21' is an ad ID to skip.
        if (adId === '21') {
          fetchAds();
          return;
        }

        // Validate adId before using it in the URL
        if (!adId || adId === 'undefined') {
          console.warn("Invalid or undefined adId received after processing:", adId);
          fetchAds(); // Retry if adId is invalid
          return;
        }

        const res2 = await fetch(`https://editor-compiler.onrender.com/api/projects/${adId}/meta/test123`);
        if (!res2.ok) { // Check if the second response was successful
          throw new Error(`HTTP error! status: ${res2.status} for project meta`);
        }
        const data2 = await res2.json();

        // The original code had `if (!res.error)` here, which isn't how fetch errors work.
        // Errors are typically caught by the .catch block or checked with `!res.ok`.
        // Assuming you want to proceed if data2 doesn't indicate an error within its payload.
        // If data2 has an 'error' property indicating an issue with the project meta,
        // you'll need to adjust this condition based on the actual structure of data2.
        if (!data2.error) { // Assuming your API returns an 'error' property on failure
          document.getElementById('adsPr').innerHTML = `<p>Check Out This New <a href="/projects#${adId}"><u>Project!</u></a></p>`;
        } else {
          console.warn("Project meta data indicated an error:", data2.error);
          fetchAds(); // Retry if project meta had an error
        }
      } catch (error) {
        console.error("Failed to fetch ads:", error);
        fetchAds();
        // You might want to implement a retry mechanism here with a delay,
        // or display a fallback message to the user instead of infinitely retrying on error.
        // For now, it will simply log the error and stop trying,
        // or you could uncomment fetchAds() to retry on *any* network/parsing error.
        // fetchAds(); // Uncomment to retry on general errors
      }
    } // <-- THIS CLOSING BRACE WAS MISSING!

  }; // Closing brace for window.onload

  // Event listener for liking project
  document.getElementById('like-btn').addEventListener('click', async () => {
    const username = localStorage.getItem('username');
    if (!username) return showLoginModal();

    try {
      const res = await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/love/${username}`, {
        method: 'POST',
        headers: { 'Authorization': username }
      });
      if (res.ok) {
        await fetchMeta();
      } else {
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  });

  // Event listener for favoriting project
  document.getElementById('fav-btn').addEventListener('click', async () => {
    const username = localStorage.getItem('username');
    if (!username) return showLoginModal();

    try {
      const res = await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/favourite/${username}`, {
        method: 'POST',
        headers: { 'Authorization': username }
      });
      if (res.ok) {
        await fetchMeta();
      } else {
      }
    } catch (err) {
      console.error('Favorite error:', err);
    }
  });

  // Go to editor page for this project
  document.getElementById('see-inside-btn').addEventListener('click', () => {
    window.location.href = `/editor/#${id}`;
  });

  // Remix button: redirect to editor with remix param (requires login)
  remix.addEventListener('click', () => {
    if (!localStorage.getItem('username')) return showLoginModal();
    window.location.href = `/editor/?remix=${id}`;
  });

  // Copy current page URL to clipboard
  function copyToClipboard() {
    const url = window.location.href;

    navigator.clipboard.writeText(url)
      .then(() => {
        console.log('URL copied to clipboard:', url);
        alert('URL copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy URL:', err);
        alert('Failed to copy URL. Try again.');
      });
  }

    document.getElementById('claimAd').addEventListener('click', () => {
      const project = prompt('What Is Your Project Link?');
      if(!project.includes('myscratchblocks')) {
        alert('Invalid Link!');
      } else {
        const id = project.replace("myscratchblocks.github.io/projects/#", "").replace("https://", "");
        postAd(id);
      }
     });

async function postAd(id) {
  try {
    const res2 = await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/meta/test123`);
    if (res2.ok) {
      const res = await fetch(`https://editor-compiler.onrender.com/ad/${window.location.hash.substring(1)}/set/${id}`);
      if (res.ok) {
        alert('Ad Uploaded!');
      } else {
        alert('Failed To Upload Ad!');
      }
    } else {
      alert('Invalid Project, Insert A Valid Project Link!');
    }
  } catch (err) {
    alert('Error: ' + err);
  }
}
