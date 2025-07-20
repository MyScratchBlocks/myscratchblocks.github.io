// Get modal elements
const reportModal = document.getElementById('id01');
const loginModal = document.getElementById('login-modal');

// Hide modals if they exist
if (reportModal) reportModal.style.display = 'none';
if (loginModal) loginModal.style.display = 'none';

// Extract project ID from URL hash
const hash = window.location.hash.substring(1);
const id = window.PI;

// Set iframe source to embed Scratch GUI with project ID
const iframe = document.getElementById('id-frame');
const remixBtn = document.getElementById('remix-btn'); // Renamed to avoid conflict with `remix` variable in global scope
if (iframe) {
  iframe.src = `https://myscratchblocks.ddns.net/scratch-gui/embed?settings-button&addons=pause,gamepad,clones,mute-project#${id}`;
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
  const shareProjectAlert = document.getElementById('share-project-btn2'); // This appears to be an alert element, not a button
  const uploadThumbnailBtn = document.getElementById('change-main-coder-btn'); // This button's current action is to unshare the project

  // Ensure all required elements exist
  if (!loading || !error || !content || !metaTitleElement || !editableTitleInput ||
    !metaDescriptionElement || !editableDescriptionTextarea || !metaAuthorElement ||
    !seeInsideBtn || !saveChangesBtn || !shareProjectBtn || !shareProjectAlert || !uploadThumbnailBtn) {
    console.error("One or more essential meta elements not found. Cannot fetch metadata.");
    if (error) {
      error.textContent = 'Critical page elements are missing. Please check the page structure.';
      error.classList.remove('hidden');
    }
    if (loading) loading.classList.add('hidden');
    if (content) content.classList.add('hidden');
    return null;
  }

  const currentUsername = localStorage.getItem('username') || 'test123'; // Default to 'test123' if no username

  if (!id) {
    console.warn("No project ID found in URL hash. Cannot fetch project metadata.");
    loading.classList.add('hidden');
    return null;
  }

  try {
    const res = await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/meta/${currentUsername}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch project metadata: ${errorText}`);
    }

    const meta = await res.json();
    const isOwner = meta.author?.username === currentUsername;

    // Control visibility of the "upload thumbnail" (unshare) button
    if (isOwner) {
      uploadThumbnailBtn.classList.remove('hidden-by-js');
    } else {
      uploadThumbnailBtn.classList.add('hidden-by-js');
    }

    metaTitleElement.textContent = meta.title || 'Untitled Project';
    editableTitleInput.value = meta.title || '';
    document.title = meta.title || 'Untitled Project'; // Update page title

    metaDescriptionElement.textContent = meta.description || 'No description.';
    editableDescriptionTextarea.value = meta.description || '';

    // Update other metadata fields
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
        shareProjectAlert.classList.remove('hidden'); // Show alert if unshared
      } else {
        shareProjectBtn.classList.add('hidden-by-js');
        shareProjectAlert.classList.add('hidden'); // Hide alert if shared
      }

      // Event listener for save changes button
      // Using .onclick to prevent duplicate listeners if fetchMeta is called multiple times
      saveChangesBtn.onclick = async () => {
        const updatedTitle = editableTitleInput.value.trim();
        const updatedDescription = editableDescriptionTextarea.value.trim();

        if (!updatedTitle) {
          alert('Title is required');
          return;
        }

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
            await fetchMeta(); // Re-fetch to update displayed info
          } else {
            alert('Failed to save project details: ' + (await saveRes.text()));
          }
        } catch (err) {
          alert('Failed to save project details due to network or server error.');
          console.error('Save project error:', err);
        }
      };


      // Event listener for share project button
      // Using .onclick to prevent duplicate listeners
      shareProjectBtn.onclick = async () => {
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
            await fetchMeta(); // Re-fetch to update displayed info and hide share button
          } else {
            alert('Error sharing project: ' + (await shareRes.text()));
          }
        } catch (err) {
          alert('Error sharing project due to network or server error.');
          console.error('Share project error:', err);
        }
      };
    } else {
      // Not owner: hide editable fields and save/share buttons
      metaTitleElement.classList.remove('hidden-by-js');
      editableTitleInput.classList.add('hidden-by-js');
      metaDescriptionElement.classList.remove('hidden-by-js');
      editableDescriptionTextarea.classList.add('hidden-by-js');
      saveChangesBtn.classList.add('hidden-by-js');
      shareProjectBtn.classList.add('hidden-by-js');
      shareProjectAlert.classList.add('hidden');
    }

    loading.classList.add('hidden');
    content.classList.remove('hidden');
    error.classList.add('hidden');
    return meta; // Return meta object on success
  } catch (err) {
    console.error('fetchMeta error:', err);
    error.textContent = `Could not load project info. Error: ${err.message}`;
    error.classList.remove('hidden');
    loading.classList.add('hidden');
    content.classList.add('hidden');
    return null; // Return null on error
  }
}

const baseUrl = 'https://editor-compiler.onrender.com';

const commentsListContainer = document.getElementById('comments-list');
const commentsLoading = document.getElementById('comments-loading');
const commentsError = document.getElementById('comments-error');
const commentForm = document.getElementById('comment-form');
const commentInput = document.getElementById('comment-input');
const commentSubmitBtn = document.getElementById('comment-submit');

// Check if all comment-related elements are present
if (!commentsListContainer || !commentsLoading || !commentsError || !commentForm || !commentInput || !commentSubmitBtn) {
  console.error("One or more comment elements not found. Comments functionality may be limited or non-functional.");
  // Consider hiding comment related sections or displaying an error message to the user
}

function reverseData(data) {
  if (!Array.isArray(data)) {
    console.error("Input to reverseData must be an array. Received:", data);
    return [];
  }
  return data.slice().reverse();
}

// Fetch comments
async function fetchComments() {
  if (!commentsLoading || !commentsError || !commentsListContainer) return; // Exit if elements are missing
  commentsLoading.classList.remove('hidden');
  commentsError.classList.add('hidden');
  commentsListContainer.innerHTML = ''; // Clear previous comments

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
  if (!commentSubmitBtn || !commentInput) return; // Exit if elements are missing

  const currentUsername = localStorage.getItem('username');

  if (!currentUsername) {
    showLoginModal(); // Prompt user to log in
    alert('You must be logged in to post a comment.');
    return;
  }

  try {
    commentSubmitBtn.disabled = true;
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
        }
      })
    });
    const jsonResponse = await res.json();
    if (res.ok) {
      commentInput.value = ''; // Clear input field
      await fetchComments(); // Re-fetch to display new comment
    } else {
      alert(jsonResponse.error || 'Failed to post comment.');
    }
  } catch (err) {
    console.error('Comment post error:', err);
    alert('Failed to post comment due to network or server error.');
  } finally {
    commentSubmitBtn.disabled = false;
    commentSubmitBtn.innerHTML = '<i class="fa-solid fa-plus mr-2"></i> Post Comment';
  }
}

// Post a reply to an existing comment/reply
async function postReply(commentId, text, formElement) {
  const currentUsername = localStorage.getItem('username');

  if (!currentUsername) {
    showLoginModal(); // Prompt user to log in
    alert('You must be logged in to post a reply.');
    return;
  }

  try {
    const replySubmitBtn = formElement.querySelector('.reply-button');
    if (replySubmitBtn) {
      replySubmitBtn.disabled = true;
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
    const jsonResponse = await res.json();
    if (res.ok) {
      formElement.remove(); // Remove the reply form after successful submission
      await fetchComments(); // Re-fetch to display new reply
    } else {
      alert(jsonResponse.error || 'Failed to post reply.');
    }
  } catch (err) {
    console.error('Reply post error:', err);
    alert('Failed to post reply due to network or server error.');
  } finally {
    const replySubmitBtn = formElement.querySelector('.reply-button');
    if (replySubmitBtn) {
      replySubmitBtn.disabled = false;
      replySubmitBtn.textContent = 'Post Reply';
    }
  }
}

// Show reply form under a comment or reply
function showReplyForm(parentCommentElement, commentId) {
  let existingForm = parentCommentElement.querySelector('.reply-form');

  if (existingForm) {
    // Toggle visibility if form already exists
    existingForm.style.display = existingForm.style.display === 'none' ? 'block' : 'none';
    if (existingForm.style.display === 'block') {
      existingForm.querySelector('.reply-textarea').focus();
    }
    return;
  }

  const form = document.createElement('form');
  form.className = 'reply-form mt-2'; // Added margin-top for spacing
  form.style.display = 'block';

  const textarea = document.createElement('textarea');
  textarea.className = 'reply-textarea w-full p-2 border rounded-md resize-y'; // Added some basic styling classes
  textarea.placeholder = 'Write your reply here...';
  textarea.required = true;
  form.appendChild(textarea);

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'reply-button mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'; // Added some basic styling classes
  submitBtn.textContent = 'Post Reply';
  form.appendChild(submitBtn);

  // Add a cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button'; // Important: type="button" to prevent form submission
  cancelBtn.className = 'cancel-reply-button mt-2 ml-2 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => form.remove(); // Simply remove the form on cancel
  form.appendChild(cancelBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = textarea.value.trim();
    if (!text) return alert('Reply text cannot be empty.');
    await postReply(commentId, text, form);
  });

  parentCommentElement.appendChild(form);
  textarea.focus();
}

// Display all comments recursively
function displayComments(comments) {
  if (!commentsListContainer) return;
  commentsListContainer.innerHTML = ''; // Clear previous comments

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
  commentItemDiv.className = 'comment-item bg-gray-100 p-3 rounded-lg mb-3'; // Added some basic styling classes
  commentItemDiv.id = `comment-${comment.id}`; // Ensure unique ID for scrolling

  if (depth > 0) {
    commentItemDiv.style.marginLeft = '3rem'; // Indent replies
    commentItemDiv.style.marginTop = '1rem';
    commentItemDiv.classList.add('border-l-4', 'border-blue-300', 'pl-4'); // Visual cue for replies
  }

  const headerDiv = document.createElement('div');
  headerDiv.className = 'flex items-center justify-between text-sm text-gray-600 mb-1'; // Styling for header
  commentItemDiv.appendChild(headerDiv);

  const authorDiv = document.createElement('span');
  authorDiv.className = 'font-semibold text-blue-700';
  authorDiv.textContent = username;
  headerDiv.appendChild(authorDiv);

  const timestampDiv = document.createElement('span');
  timestampDiv.className = 'text-gray-500';
  timestampDiv.textContent = new Date(comment.createdAt).toLocaleString();
  headerDiv.appendChild(timestampDiv);

  const textP = document.createElement('p');
  textP.className = 'comment-text text-gray-800 mb-2';
  // If 'github-md' is a custom element for markdown rendering, it needs to be defined globally.
  // Otherwise, you might need a different markdown library or simply set innerText.
  const markdownTag = document.createElement('github-md'); // Assuming this custom element is available
  markdownTag.innerHTML = comment.text; // Use innerHTML if content is HTML-like (e.g., markdown rendered to HTML)
  textP.appendChild(markdownTag);
  commentItemDiv.appendChild(textP);

  const replyBtn = document.createElement('button');
  replyBtn.className = 'reply-button text-blue-500 hover:underline text-sm';
  replyBtn.textContent = 'Reply';
  replyBtn.dataset.commentId = comment.id; // Store comment ID for reply
  commentItemDiv.appendChild(replyBtn);

  const repliesContainerDiv = document.createElement('div');
  repliesContainerDiv.className = 'replies-container mt-2';
  commentItemDiv.appendChild(repliesContainerDiv);

  if (comment.replies && comment.replies.length > 0) {
    comment.replies.forEach(reply => {
      const replyEl = createCommentElement(reply, depth + 1); // Increment depth for nested replies
      repliesContainerDiv.appendChild(replyEl);
    });
  }

  return commentItemDiv;
}

// Event listener for the main comment submission form
if (commentForm) {
  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = commentInput.value.trim();
    if (!text) return alert('Comment cannot be empty.');
    await postNewComment(text);
  });
}

// Event delegation for reply buttons (handles dynamically added buttons)
if (commentsListContainer) {
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

async function fetchAds() {
  try {
    const res = await fetch('https://editor-compiler.onrender.com/ad/random');
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();

    if (!data.ad || typeof data.ad !== 'string') {
      console.warn("Unexpected ad format received, retrying:", data.ad);
      setTimeout(fetchAds, 1000); // Retry after 1 second
      return;
    }

    const adId = data.ad.replace('ad:', '');

    if (!adId || adId === 'undefined' || adId === id) { // Ensure adId is valid and not the current project's ID
      console.warn("Invalid, undefined, or current project's adId received, retrying:", adId);
      setTimeout(fetchAds, 1000); // Retry after 1 second
      return;
    }

    // Fetch metadata for the random ad project
    const res2 = await fetch(`https://editor-compiler.onrender.com/api/projects/${adId}/meta/test123`); // 'test123' used as a placeholder
    if (!res2.ok) {
      throw new Error(`HTTP error! status: ${res2.status} for project meta with adId: ${adId}`);
    }
    const data2 = await res2.json();

    if (!data2.error) {
      const adsPrElement = document.getElementById('adsPr');
      if (adsPrElement) {
        adsPrElement.innerHTML = `<p>Check Out This New <a href="/projects#${adId}"><u>Project!</u></a></p>`;
      } else {
        console.warn("Element with ID 'adsPr' not found for main ad display.");
      }
    } else {
      console.warn("Project meta data indicated an error for ad:", data2.error, "Retrying ad fetch.");
      setTimeout(fetchAds, 1000); // Retry after 1 second if meta fetch fails
    }
  } catch (error) {
    console.error("Failed to fetch ads (main banner):", error);
    setTimeout(fetchAds, 2000); // Retry after 2 seconds on general error
  }
}

// Removed the redundant and problematic `fetchads()` function.

async function fetchAndDisplayAds() {
  const adsSidebar = document.getElementById('ads-sidebar');
  if (!adsSidebar) {
    console.error("Element with ID 'ads-sidebar' not found. Cannot display sidebar ads.");
    return;
  }

  adsSidebar.innerHTML = ''; // Clear previous ads
  const seenAdIds = new Set(); // To store IDs of ads already displayed

  const MAX_ADS = 7;
  let attempts = 0; // Prevent infinite loops if valid ads are scarce
  const MAX_ATTEMPTS = MAX_ADS * 5; // Allow more attempts than max ads

  while (seenAdIds.size < MAX_ADS && attempts < MAX_ATTEMPTS) {
    attempts++;
    try {
      const response = await fetch('https://editor-compiler.onrender.com/ad/random');
      if (!response.ok) {
        console.error('Ad fetch failed:', response.statusText);
        continue;
      }

      const data = await response.json();
      let rawAdId = data.ad;

      if (!rawAdId || typeof rawAdId !== 'string' || rawAdId.includes('undefined')) {
        console.warn('Invalid ad format received, skipping:', rawAdId);
        continue;
      }

      const adId = rawAdId.replace('ad:', '');

      // Skip current project's ID, duplicates, and any blacklisted IDs (e.g., '21')
      if (adId === id || adId === '21' || seenAdIds.has(adId)) {
        continue;
      }

      const metaRes = await fetch(`https://editor-compiler.onrender.com/api/projects/${adId}/meta/test`); // 'test' placeholder
      if (!metaRes.ok) {
        console.warn(`Meta fetch failed for adId ${adId}:`, metaRes.statusText);
        continue;
      }

      const meta = await metaRes.json();

      // Ensure meta data is valid and not an error
      if (meta.error) {
        console.warn(`Meta data indicated an error for adId ${adId}:`, meta.error);
        continue;
      }

      // Build ad element
      const adItem = document.createElement('div');
      adItem.classList.add('ad-item', 'bg-white', 'p-3', 'rounded-lg', 'shadow-md', 'mb-4', 'text-center'); // Added styling
      adItem.innerHTML = `
        <h4 class="font-bold text-md mb-2">${meta.title || 'Untitled Project'}</h4>
        <img src="https://editor-compiler.onrender.com${meta.image || '/images/No%20Cover%20Available.png'}"
             alt="${meta.title || 'Ad Image'}"
             class="w-full h-24 object-cover rounded-md mb-2"
             onerror="this.onerror=null;this.src='/images/No%20Cover%20Available.png';">
        <a href="/projects/${adId}" target="_blank" class="text-blue-500 hover:underline text-sm mt-2 block">
          By ${meta.author?.username || 'Unknown'}
        </a>
      `;

      adsSidebar.appendChild(adItem);
      seenAdIds.add(adId);

    } catch (error) {
      console.error('Error fetching ad for sidebar:', error);
      // Add a placeholder if an ad fails to load, but don't count it towards seenAdIds for successful display
      // For simplicity, we'll just log and continue. If you want to show a "failed ad" box, you can uncomment below.
      /*
      const adItem = document.createElement('div');
      adItem.classList.add('ad-item', 'bg-red-100', 'p-3', 'rounded-lg', 'mb-4');
      adItem.innerHTML = `<h4>Ad failed to load.</h4><p class="text-red-600 text-sm">Network error or invalid ad data.</p>`;
      adsSidebar.appendChild(adItem);
      */
    }
  }
}


// Event listener for liking project
const likeBtn = document.getElementById('like-btn');
if (likeBtn) {
  likeBtn.addEventListener('click', async () => {
    const username = localStorage.getItem('username');
    if (!username) {
      showLoginModal();
      return;
    }

    try {
      const res = await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/love/${username}`, {
        method: 'POST',
        headers: {
          'Authorization': username // Ensure authorization header is sent
        }
      });
      if (res.ok) {
        await fetchMeta(); // Update UI after liking
      } else {
        console.error('Failed to like project:', await res.text());
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  });
}

// Event listener for favoriting project
const favBtn = document.getElementById('fav-btn');
if (favBtn) {
  favBtn.addEventListener('click', async () => {
    const username = localStorage.getItem('username');
    if (!username) {
      showLoginModal();
      return;
    }

    try {
      const res = await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/favourite/${username}`, {
        method: 'POST',
        headers: {
          'Authorization': username // Ensure authorization header is sent
        }
      });
      if (res.ok) {
        await fetchMeta(); // Update UI after favoriting
      } else {
        console.error('Failed to favorite project:', await res.text());
      }
    } catch (err) {
      console.error('Favorite error:', err);
    }
  });
}

// Go to editor page for this project
const seeInsideBtnGlobal = document.getElementById('see-inside-btn');
if (seeInsideBtnGlobal) {
  seeInsideBtnGlobal.addEventListener('click', () => {
    window.location.href = `/editor/#${id}`;
  });
}

// Remix button: redirect to editor with remix param (requires login)
// Using `remixBtn` as defined at the top
if (remixBtn) {
  remixBtn.addEventListener('click', () => {
    if (!localStorage.getItem('username')) {
      showLoginModal();
      return;
    }
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
      alert('Failed to copy URL. Please copy manually.');
    });
}

// Event listener for claimAd button
const claimAdBtn = document.getElementById('claimAd');
if (claimAdBtn) {
  claimAdBtn.addEventListener('click', () => {
    const project = prompt('What is your project link? (e.g., [https://myscratchblocks.ddns.net/projects/YOUR_PROJECT_ID](https://myscratchblocks.ddns.net/projects/YOUR_PROJECT_ID))');
    if (!project) return; // User cancelled

    if (!project.includes('myscratchblocks.ddns.net/projects#')) { // Updated domain check
      alert('Invalid Link! The link must be from myscratchblocks.ddns.net and include a project ID.');
      return;
    }

    const projectIdMatch = project.match(/([a-zA-Z0-9]+)$/);
    let projectIdToClaim = '';
    if (projectIdMatch && projectIdMatch[1]) {
      projectIdToClaim = projectIdMatch[1];
    } else {
      alert('Could not extract project ID from the link. Please ensure it ends with #YOUR_PROJECT_ID.');
      return;
    }

    postAd(projectIdToClaim);
  });
}

async function postAd(projectIdToClaim) {
  try {
    // First, validate the project exists by fetching its metadata
    const res2 = await fetch(`https://editor-compiler.onrender.com/api/projects/${projectIdToClaim}/meta/test123`); // 'test123' placeholder
    if (!res2.ok) {
      alert('Invalid Project Link! Project not found or accessible. ' + (await res2.text()));
      return;
    }

    // If project is valid, then attempt to set the ad
    const res = await fetch(`https://editor-compiler.onrender.com/ad/${id}/set/${projectIdToClaim}`);
    if (res.ok) {
      alert('Ad uploaded successfully!');
    } else {
      alert('Failed to upload ad! ' + (await res.text()));
    }
  } catch (err) {
    alert('Error posting ad: ' + err.message);
    console.error('Error in postAd:', err);
  }
}

// Event listener for the "change-main-coder-btn" which currently triggers unsharing
// Note: Its ID 'change-main-coder-btn' suggests changing a coder, but the code performs 'unshare'.
// If intended for thumbnail upload, this section needs significant change.
const uploadThumbnailBtn = document.getElementById('change-main-coder-btn');
if (uploadThumbnailBtn) {
  uploadThumbnailBtn.addEventListener('click', async () => { // Made the function async
    if (!localStorage.getItem('username')) {
      showLoginModal();
      return;
    }

    if (!confirm("Are you sure you want to unshare this project? This will make it private.")) {
      return;
    }

    try {
      const response = await fetch(`https://editor-compiler.onrender.com/api/unshare/${id}`, { // Use global `id`
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // const result = await response.json(); // If API returns JSON, handle it
        alert('Project unshared successfully!');
        await fetchMeta(); // Re-fetch meta to update UI (e.g., share button visibility)
        console.log('Project unshared successfully.');
      } else {
        const errorData = await response.json(); // Assuming error response is JSON
        alert(`Failed to unshare project: ${errorData.error || response.statusText}`);
        console.error('Failed to unshare project:', errorData);
      }
    } catch (error) {
      alert('An error occurred while unsharing the project. Please try again.');
      console.error('Network error or unexpected issue during unshare:', error);
    }
    // The `fileInput` and `document.body.removeChild(fileInput)` lines were removed
    // as they indicate a file upload process that is not implemented here.
  });
}

const closeAnchorAdBtn = document.getElementById('close-anchor-ad');
if (closeAnchorAdBtn) {
  closeAnchorAdBtn.addEventListener('click', () => {
    const anchorAd = document.getElementById('anchor-ad');
    if (anchorAd) {
      anchorAd.style.display = 'none';
    }
  });
}


document.addEventListener('DOMContentLoaded', async () => {
  // Execute initial fetches
  await fetchAds(); // Fetch main project ad banner
  const metaData = await fetchMeta(); // Fetch project metadata
  await fetchComments();
  fetchAndDisplayAds(); // Fetch sidebar ads

  const accountElement = document.getElementById('account');
  const username = localStorage.getItem('username');
  const params = new URLSearchParams(window.location.search);
  const scrollToId = params.get('commentId');

  if (scrollToId) {
    // Use a small delay to ensure comments are rendered before attempting to scroll
    setTimeout(() => {
      const element = document.getElementById(`comment-${scrollToId}`); // Ensure ID matches what createCommentElement uses
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth', // Smooth scroll for better UX
          block: 'center' // Center the element in the viewport
        });
        element.style.outline = '2px solid red'; // Highlight the scrolled-to comment
        setTimeout(() => {
          element.style.outline = ''; // Remove highlight after a delay
        }, 2000);
        console.log(`Successfully scrolled to comment ID: ${scrollToId}`);
      } else {
        alert(`Comment with ID '${scrollToId}' not found on the page.`);
        console.error(`Element with ID 'comment-${scrollToId}' not found for scrolling after comments loaded.`);
      }
    }, 500); // Increased timeout slightly
  } else {
    console.log("No 'commentId' parameter found in URL for scrolling.");
  }

  // Update account display and record project view if user is logged in
  if (username) {
    if (accountElement) accountElement.textContent = username;
    try {
      // Only record view if metaData was successfully fetched and project is visible
      if (metaData) { // Assuming 'unshared' means private
        await fetch(`https://editor-compiler.onrender.com/api/${id}/views/${username}`, {
          method: 'POST'
        });
        console.log(`View recorded for user: ${username} on project: ${id}`);
      } else if (!metaData) {
        console.warn("View not recorded: Project metadata could not be fetched.");
      } else {
        console.log("View not recorded: Project is unshared/private.");
      }
    } catch (err) {
      console.warn("Failed to record view:", err);
    }
  }
});
