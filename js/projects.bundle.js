// get modal elements
const reportModal = document.getElementById('id01');
const loginModal = document.getElementById('login-modal');
if (reportModal) reportModal.style.display = 'none'; // Added null check
if (loginModal) loginModal.style.display = 'none';   // Added null check

// Extract project ID from URL hash
const hash = window.location.hash.substring(1);
const id = hash.split('?')[0];

// Set iframe source to embed Scratch GUI with project ID
const iframe = document.getElementById('id-frame');
const remix = document.getElementById('remix-btn');
if (iframe) { // Added null check
  iframe.src = `https://myscratchblocks.github.io/scratch-gui/embed#${id}`;
}

// Show/hide login modal
function closeLoginModal() {
  if (loginModal) loginModal.style.display = 'none';
}

function showLoginModal() {
  if (loginModal) loginModal.style.display = 'flex';
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
  const shareProjectAlert = document.getElementById('share-project-btn2'); // This ID seems a bit off, usually alerts have different IDs
  const changeMainCoderBtn = document.getElementById('change-main-coder-btn'); // Renamed `elem` for clarity

  // Ensure elements exist before trying to access properties
  if (!loading || !error || !content || !metaTitleElement || !editableTitleInput ||
    !metaDescriptionElement || !editableDescriptionTextarea || !metaAuthorElement ||
    !seeInsideBtn || !saveChangesBtn || !shareProjectBtn || !shareProjectAlert || !changeMainCoderBtn) {
    console.error("One or more meta elements not found. Cannot fetch metadata.");
    return;
  }

  // Moved currentUsername declaration outside the if/else to ensure scope
  let currentUsername = 'test123'; // Default username

  if (localStorage.getItem('SECURE_ID')) {
    try {
      const res5 = await fetch(`https://corsproxy.io/?url=https://scratch-id.onrender.com/verification/${localStorage.getItem('SECURE_ID')}`);
      if (!res5.ok) throw new Error(`Verification failed: ${res5.statusText}`);
      const data = await res5.json();
      const key = Object.keys(data)[0];
      if (data[key] && data[key].user) {
        currentUsername = data[key].user;
      }
    } catch (err) {
      console.error('Error fetching secure ID verification:', err);
      // Fallback to default username if verification fails
      currentUsername = 'test123';
    }
  }

  if (!id) {
    console.warn("No project ID found in URL hash. Cannot fetch project metadata.");
    loading.classList.add('hidden');
    return;
  }

  try {
    const res = await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/meta/${currentUsername}`, { // Use dynamic currentUsername
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) throw new Error(await res.text());

    const meta = await res.json();
    const isOwner = meta.author?.username === currentUsername; // Check ownership correctly

    if (isOwner) {
      changeMainCoderBtn.classList.remove('hidden-by-js');
    } else {
      changeMainCoderBtn.classList.add('hidden-by-js'); // Ensure it's hidden if not owner
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
      editableTitleInput.classList.remove('hidden-by-js');
      metaDescriptionElement.classList.add('hidden-by-js');
      editableDescriptionTextarea.classList.remove('hidden-by-js');
      saveChangesBtn.classList.remove('hidden-by-js');

      if (meta.visibility === 'unshared') {
        shareProjectBtn.classList.remove('hidden-by-js');
        shareProjectAlert.classList.remove('hidden');
        shareProjectAlert.style.display = 'block';
      } else {
        // Ensure share elements are hidden if project is already shared
        shareProjectBtn.classList.add('hidden-by-js');
        shareProjectAlert.classList.add('hidden');
        shareProjectAlert.style.display = 'none';
      }


      // Event listener for save changes button
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
                'Authorization': currentUsername // Use dynamic currentUsername
              },
              body: JSON.stringify({
                title: updatedTitle,
                description: updatedDescription
              })
            });

            if (saveRes.ok) {
              alert('Saved successfully!');
              await fetchMeta(); // Re-fetch meta to update display
            } else {
              alert(await saveRes.text());
            }
          } catch (err) {
            alert('Failed to save project details.');
            console.error('Save project error:', err);
          }
        });
        saveChangesBtn.dataset.listenerAttached = true;
      }

      // Event listener for share project button
      if (!shareProjectBtn.dataset.listenerAttached) {
        shareProjectBtn.addEventListener('click', async () => {
          if (!confirm("Are you sure you want to share this project?")) return;
          try {
            const shareRes = await fetch(`https://editor-compiler.onrender.com/api/share/${id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            if (shareRes.ok) {
              alert('Project shared!');
              await fetchMeta(); // Re-fetch meta to update visibility
            } else {
              alert(await shareRes.text());
            }
          } catch (err) {
            alert('Error sharing project.');
            console.error('Share project error:', err);
          }
        });
        shareProjectBtn.dataset.listenerAttached = true;
      }
    } else {
      // Not owner: hide editable fields and save/share buttons
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
} // Corrected closing brace for fetchMeta

// ========== COMMENTS FUNCTIONALITY ==========

const baseUrl = 'https://editor-compiler.onrender.com';

const commentsListContainer = document.getElementById('comments-list');
const commentsLoading = document.getElementById('comments-loading');
const commentsError = document.getElementById('comments-error');
const commentForm = document.getElementById('comment-form');
const commentInput = document.getElementById('comment-input');
const commentSubmitBtn = document.getElementById('comment-submit');

// Added null checks for comment elements
if (!commentsListContainer || !commentsLoading || !commentsError || !commentForm || !commentInput || !commentSubmitBtn) {
  console.error("One or more comment elements not found. Comments functionality may be limited.");
}

function reverseData(data) {
  if (!Array.isArray(data)) {
    // It's better to throw an error or return an empty array/original data if the input isn't an array
    console.error("Input to reverseData must be an array.");
    return []; // Or throw new Error("Input must be an array.");
  }
  return data.slice().reverse();
}

// Fetch comments
async function fetchComments() {
  if (!commentsLoading || !commentsError || !commentsListContainer) return; // Prevent errors if elements don't exist
  commentsLoading.classList.remove('hidden');
  commentsError.classList.add('hidden');
  commentsListContainer.innerHTML = ''; // Clear existing comments

  try {
    const response = await fetch(`${baseUrl}/${id}/comments`);
    if (!response.ok) throw new Error(`Failed to fetch comments: ${response.statusText}`);
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
  if (!commentSubmitBtn || !commentInput) return; // Prevent errors if elements don't exist

  let currentUsername = 'test123'; // Default username

  if (localStorage.getItem('SECURE_ID')) {
    try {
      const res4 = await fetch(`https://corsproxy.io/?url=https://scratch-id.onrender.com/verification/${localStorage.getItem('SECURE_ID')}/`);
      if (!res4.ok) throw new Error(`Verification failed: ${res4.statusText}`);
      const data = await res4.json();
      const key = Object.keys(data)[0];
      if (data[key] && data[key].user) {
        currentUsername = data[key].user;
      }
    } catch (err) {
      console.error('Error fetching secure ID for comment:', err);
      // Fallback to default username if verification fails
      currentUsername = 'test123';
    }
  }

  if (currentUsername === 'test123') { // If user is not logged in or verification failed
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
        user: {
          username: currentUsername
        } // Use dynamic currentUsername
      })
    });
    const jsonResponse = await res.json(); // Await json()
    if (res.ok) {
      commentInput.value = ''; // Clear input
      await fetchComments(); // Refresh comments
    } else {
      alert(jsonResponse.error || 'Failed to post comment.'); // Display specific error from backend
    }
  } catch (err) {
    console.error('Comment post error:', err);
    alert('Failed to post comment due to network or server error.');
  } finally {
    commentSubmitBtn.disabled = false; // Re-enable button
    commentSubmitBtn.innerHTML = '<i class="fa-solid fa-plus mr-2"></i> Post Comment';
  }
}

// Post a reply to an existing comment/reply
async function postReply(commentId, text, formElement) {
  let currentUsername = localStorage.getItem('username'); // Use localStorage for username

  if (!currentUsername) { // If username not in localStorage
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
        user: {
          username: currentUsername
        }
      })
    });
    const jsonResponse = await res.json(); // Await json()
    if (res.ok) {
      formElement.remove(); // Remove the reply form
      await fetchComments(); // Refresh comments
    } else {
      alert(jsonResponse.error || 'Failed to post reply.'); // Display specific error from backend
    }
  } catch (err) {
    console.error('Reply post error:', err);
    alert('Failed to post reply due to network or server error.');
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
  if (!commentsListContainer) return; // Prevent error if element doesn't exist
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
  const username = typeof comment.user === 'string' ? comment.user : (comment.user?.username || 'Anonymous');

  const commentItemDiv = document.createElement('div');
  commentItemDiv.className = 'comment-item';
  commentItemDiv.id = comment.id;

  if (depth > 0) {
    commentItemDiv.style.marginLeft = '3rem';
    commentItemDiv.style.marginTop = '1rem';
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
  const markdownTag = document.createElement('github-md');
  markdownTag.innerHTML = comment.text;
  textP.appendChild(markdownTag);
  commentItemDiv.appendChild(textP);

  const replyBtn = document.createElement('button');
  replyBtn.className = 'reply-button';
  replyBtn.textContent = 'Reply';
  replyBtn.dataset.commentId = comment.id;
  commentItemDiv.appendChild(replyBtn);

  const repliesContainerDiv = document.createElement('div');
  repliesContainerDiv.className = 'replies-container';
  commentItemDiv.appendChild(repliesContainerDiv);

  if (comment.replies && comment.replies.length > 0) {
    comment.replies.forEach(reply => {
      const replyEl = createCommentElement(reply, 1);
      repliesContainerDiv.appendChild(replyEl);
    });
  }

  return commentItemDiv;
}

// Event listener for the main comment submission form
if (commentForm) { // Added null check
  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = commentInput.value.trim();
    if (!text) return alert('Comment cannot be empty.');
    await postNewComment(text);
  });
}


// Event delegation for reply buttons
if (commentsListContainer) { // Added null check
  commentsListContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('reply-button')) {
      const commentId = e.target.dataset.commentId;
      const parentCommentElement = e.target.closest('.comment-item');
      if (parentCommentElement && commentId) {
        showReplyForm(parentCommentElement, commentId);
      }
    }
  });
}


window.onload = async () => {
  await fetchAds();
  await fetchMeta();
  await fetchComments(); // Ensure comments are fetched and rendered

  const accountElement = document.getElementById('account');
  const username = localStorage.getItem('username');
  const params = new URLSearchParams(window.location.search);
  const scrollToId = params.get('commentId');

  if (scrollToId) {
    // Add a small timeout to allow the browser to fully render the comments
    setTimeout(() => {
      const element = document.getElementById(scrollToId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Optional: Add a temporary visual highlight for debugging
        element.style.outline = '2px solid red';
        setTimeout(() => {
          element.style.outline = ''; // Remove highlight after a few seconds
        }, 2000);
        console.log(`Successfully scrolled to comment ID: ${scrollToId}`);
      } else {
        // CHANGED HERE: Use alert instead of console.warn
        alert(`Comment with ID '${scrollToId}' not found.`);
        // You might still want a console log for debugging purposes, but the alert is now primary
        console.error(`Element with ID '${scrollToId}' not found for scrolling after comments loaded.`);
      }
    }, 100); // A small delay of 100ms is still recommended to ensure rendering
  } else {
    console.log("No 'commentId' parameter found in URL for scrolling.");
  }

  if (username) {
    if (accountElement) accountElement.textContent = username;
    try {
      await fetch(`https://editor-compiler.onrender.com/api/${id}/views/${username}`, {
        method: 'POST'
      });
    } catch (err) {
      console.warn("Failed to record view:", err);
    }
  }
};

async function fetchAds() {
  try {
    const res = await fetch('https://editor-compiler.onrender.com/ad/random');
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();

    if (!data.ad || typeof data.ad !== 'string') {
      console.warn("Unexpected ad format received, retrying:", data.ad);
      // It's good to have a small delay here to prevent hammering the server on bad responses
      setTimeout(fetchAds, 1000);
      return;
    }

    const adId = data.ad.replace('ad:', '');

    // Skip adId '21' as per original logic
    if (adId === '21') {
      console.log("Skipping adId 21, fetching another ad.");
      setTimeout(fetchAds, 100); // Small delay before retrying
      return;
    }

    if (!adId || adId === 'undefined') {
      console.warn("Invalid or undefined adId received after processing, retrying:", adId);
      setTimeout(fetchAds, 1000);
      return;
    }

    const res2 = await fetch(`https://editor-compiler.onrender.com/api/projects/${adId}/meta/test123`);
    if (!res2.ok) {
      throw new Error(`HTTP error! status: ${res2.status} for project meta with adId: ${adId}`);
    }
    const data2 = await res2.json();

    // Check if data2 indicates an error in its payload
    if (!data2.error) {
      const adsPrElement = document.getElementById('adsPr');
      if (adsPrElement) {
        adsPrElement.innerHTML = `<p>Check Out This New <a href="/projects#${adId}"><u>Project!</u></a></p>`;
      } else {
        console.warn("Element with ID 'adsPr' not found.");
      }
    } else {
      console.warn("Project meta data indicated an error for ad:", data2.error, "Retrying ad fetch.");
      setTimeout(fetchAds, 1000);
    }
  } catch (error) {
    console.error("Failed to fetch ads:", error);
    // Implement a backoff strategy if retrying on error
    setTimeout(fetchAds, 2000); // Retry after 2 seconds on error
  }
} // Corrected closing brace for fetchAds

// Event listener for liking project
const likeBtn = document.getElementById('like-btn');
if (likeBtn) { // Added null check
  likeBtn.addEventListener('click', async () => {
    const username = localStorage.getItem('username');
    if (!username) return showLoginModal();

    try {
      const res = await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/love/${username}`, {
        method: 'POST',
        headers: {
          'Authorization': username
        }
      });
      if (res.ok) {
        await fetchMeta(); // Refresh meta after successful like
      } else {
        // Handle specific server errors if needed
        console.error('Failed to like project:', await res.text());
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  });
}


// Event listener for favoriting project
const favBtn = document.getElementById('fav-btn');
if (favBtn) { // Added null check
  favBtn.addEventListener('click', async () => {
    const username = localStorage.getItem('username');
    if (!username) return showLoginModal();

    try {
      const res = await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/favourite/${username}`, {
        method: 'POST',
        headers: {
          'Authorization': username
        }
      });
      if (res.ok) {
        await fetchMeta(); // Refresh meta after successful favorite
      } else {
        // Handle specific server errors if needed
        console.error('Failed to favorite project:', await res.text());
      }
    } catch (err) {
      console.error('Favorite error:', err);
    }
  });
}


// Go to editor page for this project
const seeInsideBtn = document.getElementById('see-inside-btn'); // Re-get the element here as it might be used before global scope
if (seeInsideBtn) { // Added null check
  seeInsideBtn.addEventListener('click', () => {
    window.location.href = `/editor/#${id}`;
  });
}


// Remix button: redirect to editor with remix param (requires login)
// `remix` is already defined globally, but check if it exists
if (remix) { // Added null check
  remix.addEventListener('click', () => {
    if (!localStorage.getItem('username')) return showLoginModal();
    window.location.href = `/editor/?remix=${id}`;
  });
}


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

// Event listener for claimAd button
const claimAdBtn = document.getElementById('claimAd');
if (claimAdBtn) { // Added null check
  claimAdBtn.addEventListener('click', () => {
    const project = prompt('What Is Your Project Link?');
    if (!project) return; // User cancelled prompt

    // Basic validation for URL inclusion
    if (!project.includes('myscratchblocks')) {
      alert('Invalid Link! The link must be from myscratchblocks.github.io.');
      return;
    }

    // Extract project ID more robustly
    const projectIdMatch = project.match(/#([a-zA-Z0-9]+)$/);
    let projectId = '';
    if (projectIdMatch && projectIdMatch[1]) {
      projectId = projectIdMatch[1];
    } else {
      alert('Could not extract project ID from the link. Please ensure it ends with #YOUR_PROJECT_ID.');
      return;
    }

    postAd(projectId);
  });
}


async function postAd(projectId) {
  try {
    const res2 = await fetch(`https://editor-compiler.onrender.com/api/projects/${projectId}/meta/test123`);
    if (res2.ok) {
      const res = await fetch(`https://editor-compiler.onrender.com/ad/${id}/set/${projectId}`); // Changed window.location.hash.split('?')[0] to global `id`
      if (res.ok) {
        alert('Ad Uploaded!');
      } else {
        alert('Failed To Upload Ad! ' + (await res.text())); // Provide more specific error
      }
    } else {
      alert('Invalid Project, Insert A Valid Project Link! ' + (await res2.text())); // Provide more specific error
    }
  } catch (err) {
    alert('Error posting ad: ' + err.message); // Use err.message for clearer error
    console.error('Error in postAd:', err);
  }
                                         }
