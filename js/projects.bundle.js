// Get modal elements
const reportModal = document.getElementById('id01');
const loginModal = document.getElementById('login-modal');
if (reportModal) reportModal.style.display = 'none';
if (loginModal) loginModal.style.display = 'none';

// Extract project ID from URL hash
const hash = window.location.hash.substring(1);
const id = hash.split('?')[0];

// Set iframe source to embed Scratch GUI with project ID
const iframe = document.getElementById('id-frame');
const remix = document.getElementById('remix-btn');
if (iframe) {
  iframe.src = `https://myscratchblocks.github.io/scratch-gui/embed?settings-button&addons=pause,gamepad,clones,mute-project#${id}`;
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
  const shareProjectAlert = document.getElementById('share-project-btn2');
  const uploadThumbnailBtn = document.getElementById('change-main-coder-btn'); // Renamed for clarity to reflect its primary action in code

  // Ensure elements exist before trying to access properties
  if (!loading || !error || !content || !metaTitleElement || !editableTitleInput ||
    !metaDescriptionElement || !editableDescriptionTextarea || !metaAuthorElement ||
    !seeInsideBtn || !saveChangesBtn || !shareProjectBtn || !shareProjectAlert || !uploadThumbnailBtn) {
    console.error("One or more meta elements not found. Cannot fetch metadata.");
    return;
  }

  // Use localStorage.getItem('username') directly for the current username
  const currentUsername = localStorage.getItem('username') || 'test123';

  if (!id) {
    console.warn("No project ID found in URL hash. Cannot fetch project metadata.");
    loading.classList.add('hidden');
    return;
  }

  try {
    const res = await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/meta/${currentUsername}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) throw new Error(await res.text());

    const meta = await res.json();
    const isOwner = meta.author?.username === currentUsername;

    if (isOwner) {
      uploadThumbnailBtn.classList.remove('hidden-by-js');
    } else {
      uploadThumbnailBtn.classList.add('hidden-by-js');
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
      } else {
        shareProjectBtn.classList.add('hidden-by-js');
        shareProjectAlert.classList.add('hidden');
      }

      // Event listener for save changes button
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
            await fetchMeta();
          } else {
            alert(await saveRes.text());
          }
        } catch (err) {
          alert('Failed to save project details.');
          console.error('Save project error:', err);
        }
      });


      // Event listener for share project button
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
            await fetchMeta();
          } else {
            alert(await shareRes.text());
          }
        } catch (err) {
          alert('Error sharing project.');
          console.error('Share project error:', err);
        }
      });
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

if (!commentsListContainer || !commentsLoading || !commentsError || !commentForm || !commentInput || !commentSubmitBtn) {
  console.error("One or more comment elements not found. Comments functionality may be limited.");
}

function reverseData(data) {
  if (!Array.isArray(data)) {
    console.error("Input to reverseData must be an array.");
    return [];
  }
  return data.slice().reverse();
}

// Fetch comments
async function fetchComments() {
  if (!commentsLoading || !commentsError || !commentsListContainer) return;
  commentsLoading.classList.remove('hidden');
  commentsError.classList.add('hidden');
  commentsListContainer.innerHTML = '';

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
  if (!commentSubmitBtn || !commentInput) return;

  const currentUsername = localStorage.getItem('username'); // Use localStorage username

  if (!currentUsername) { // If username is not set, show login modal
    showLoginModal();
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
      commentInput.value = '';
      await fetchComments();
    } else {
      alert(jsonResponse.error || 'Failed to post comment.');
    }
  } catch (err) {
    console.error('Comment post error:', err);
    alert(err);
  } finally {
    commentSubmitBtn.disabled = false;
    commentSubmitBtn.innerHTML = '<i class="fa-solid fa-plus mr-2"></i> Post Comment';
  }
}

// Post a reply to an existing comment/reply
async function postReply(commentId, text, formElement) {
  const currentUsername = localStorage.getItem('username'); // Use localStorage username

  if (!currentUsername) { // If username is not set, show login modal
    showLoginModal();
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
      formElement.remove();
      await fetchComments();
    } else {
      alert(jsonResponse.error || 'Failed to post reply.');
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
  let existingForm = parentCommentElement.querySelector('.reply-form');

  if (existingForm) {
    existingForm.style.display = existingForm.style.display === 'none' ? 'block' : 'none';
    existingForm.querySelector('.reply-textarea').focus();
    return;
  }

  const form = document.createElement('form');
  form.className = 'reply-form';
  form.style.display = 'block';

  const textarea = document.createElement('textarea');
  textarea.className = 'reply-textarea';
  textarea.placeholder = 'Write your reply here...';
  textarea.required = true;
  form.appendChild(textarea);

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'reply-button';
  submitBtn.textContent = 'Post Reply';
  form.appendChild(submitBtn);

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
  commentsListContainer.innerHTML = '';

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
if (commentForm) {
  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = commentInput.value.trim();
    if (!text) return alert('Comment cannot be empty.');
    await postNewComment(text);
  });
}

// Event delegation for reply buttons
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
      setTimeout(fetchAds, 1000);
      return;
    }

    const adId = data.ad.replace('ad:', '');

    if (adId === '21') {
      console.log("Skipping adId 21, fetching another ad.");
      setTimeout(fetchAds, 100);
      return;
    }

    if (!adId || adId === 'undefined') {
      console.warn("Invalid or undefined adId received after processing, retrying:", adId);
      setTimeout(fetchAds, 1000);
      return;
    }

    const res2 = await fetch(`https://editor-compiler.onrender.com/api/projects/${adId}/meta/test123`); // 'test123' used as a placeholder if no username is needed for this public meta fetch
    if (!res2.ok) {
      throw new Error(`HTTP error! status: ${res2.status} for project meta with adId: ${adId}`);
    }
    const data2 = await res2.json();

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
    setTimeout(fetchAds, 2000);
  }
}

async function fetchads() {
  const response = await fetch('https://editor-compiler.onrender.com/ad/random');
  if (response.ok) {
    const ad = await response.json();
    if(ad.includes('undefined')) {
      const res = await fetch('https://editor-compiler.onrender.com/ad/random');
      if(res.ok) {
        const ad = await res.json();
        if (ads.includes(ad.ad.replace('ad:', ''))) {
          fetchads();
        } else {
          return ad.ad.replace('ad:', '');
        }
      }
    }
  }
}

// Function to fetch and display ads in the sidebar
async function fetchAndDisplayAds() {
  let ads = {};
  const adsSidebar = document.getElementById('ads-sidebar');
  if (!adsSidebar) {
    console.error("Element with ID 'ads-sidebar' not found.");
    return;
  }
  adsSidebar.innerHTML = ''; // Clear previous ads

  for (let i = 0; i < 7; i++) {
    try {
      const response = await fetch('https://editor-compiler.onrender.com/ad/random');
      if (response.ok) {
        const ad = await response.json();
        if(ad.includes('undefined')) {
          const res = await fetch('https://editor-compiler.onrender.com/ad/random');
          if(res.ok) {
            const ad = await res.json();
          }
        }
        // Skip adId '21' as per logic in fetchAds
        const adId = fetchads();
      }
        ads.push(adId);
          i--; // Decrement counter to ensure 5 ads are fetched
          continue;
        }

        const res = await fetch(`https://editor-compiler.onrender.com/api/projects/${adId}/meta/test`); // 'test' placeholder
        if (res.ok) {
          const json = await res.json();
          const adItem = document.createElement('div');
          adItem.classList.add('ad-item');
          adItem.innerHTML = `
            <h4>${json.title || 'Untitled Project'}</h4>
            <img src="https://editor-compiler.onrender.com${json.image || '/images/No%20Cover%20Available.png'}" alt="${json.title || 'Ad Image'}" onerror="this.onerror=null;this.src='/images/No%20Cover%20Available.png';">
            <a href="/projects#${adId}" target="_blank" class="text-blue-500 hover:underline text-sm mt-2 block">By ${json.author?.username || 'Unknown'}</a>
          `;
          adsSidebar.appendChild(adItem);
        } else {
          console.error(`Failed to fetch project meta for ad ${i + 1}:`, res.status, res.statusText);
          const adItem = document.createElement('div');
          adItem.classList.add('ad-item');
          adItem.innerHTML = `<h4>Ad failed to load.</h4><p>Details not available.</p>`;
          adsSidebar.appendChild(adItem);
        }
      } else {
        console.error(`Failed to fetch ad ${i + 1}:`, response.status, response.statusText);
        const adItem = document.createElement('div');
        adItem.classList.add('ad-item');
        adItem.innerHTML = `<h4>Ad failed to load.</h4><p>Please try again later.</p>`;
        adsSidebar.appendChild(adItem);
      }
    } catch (error) {
      console.error(`Error fetching ad ${i + 1}:`, error);
      const adItem = document.createElement('div');
      adItem.classList.add('ad-item');
      adItem.innerHTML = `<h4>Ad failed to load.</h4><p>Network error.</p>`;
      adsSidebar.appendChild(adItem);
    }
  }
}

// Event listener for liking project
const likeBtn = document.getElementById('like-btn');
if (likeBtn) {
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
        await fetchMeta();
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
    if (!username) return showLoginModal();

    try {
      const res = await fetch(`https://editor-compiler.onrender.com/api/projects/${id}/favourite/${username}`, {
        method: 'POST',
        headers: {
          'Authorization': username
        }
      });
      if (res.ok) {
        await fetchMeta();
      } else {
        console.error('Failed to favorite project:', await res.text());
      }
    } catch (err) {
      console.error('Favorite error:', err);
    }
  });
}

// Go to editor page for this project
// `seeInsideBtn` is already defined in fetchMeta, but getting it here for clarity for its own event listener
const seeInsideBtnGlobal = document.getElementById('see-inside-btn');
if (seeInsideBtnGlobal) {
  seeInsideBtnGlobal.addEventListener('click', () => {
    window.location.href = `/editor/#${id}`;
  });
}

// Remix button: redirect to editor with remix param (requires login)
if (remix) {
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
if (claimAdBtn) {
  claimAdBtn.addEventListener('click', () => {
    const project = prompt('What Is Your Project Link?');
    if (!project) return;

    if (!project.includes('myscratchblocks')) {
      alert('Invalid Link! The link must be from myscratchblocks.github.io.');
      return;
    }

    const projectIdMatch = project.match(/#([a-zA-Z0-9]+)$/);
    let projectIdToClaim = ''; // Renamed to avoid confusion with global `id`
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
    const res2 = await fetch(`https://editor-compiler.onrender.com/api/projects/${projectIdToClaim}/meta/test123`); // 'test123' placeholder
    if (res2.ok) {
      const res = await fetch(`https://editor-compiler.onrender.com/ad/${id}/set/${projectIdToClaim}`);
      if (res.ok) {
        alert('Ad Uploaded!');
      } else {
        alert('Failed To Upload Ad! ' + (await res.text()));
      }
    } else {
      alert('Invalid Project, Insert A Valid Project Link! ' + (await res2.text()));
    }
  } catch (err) {
    alert('Error posting ad: ' + err.message);
    console.error('Error in postAd:', err);
  }
}

// Event listener for uploading thumbnail
const uploadThumbnailBtn = document.getElementById('change-main-coder-btn'); // Get the element again for this specific listener
if (uploadThumbnailBtn) {
  uploadThumbnailBtn.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    fileInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];

      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file for the thumbnail.');
        return;
      }

      try {
        const response = await fetch(`https://editor-compiler.onrender.com/api/upload/${id}`, { // Use global `id`
          method: 'POST',
          headers: {
            'Content-Type': file.type
          },
          body: file
        });

        if (response.ok) {
          const result = await response.json();
          alert('Thumbnail uploaded successfully!');
          console.log('Upload successful:', result);
        } else {
          const errorData = await response.json();
          alert(`Failed to upload thumbnail: ${errorData.error || response.statusText}`);
          console.error('Upload failed:', errorData);
        }
      } catch (error) {
        alert('An error occurred during upload. Please try again.');
        console.error('Network error or unexpected issue:', error);
      }

      document.body.removeChild(fileInput);
    });

    fileInput.click();
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

// Main initialization logic
document.addEventListener('DOMContentLoaded', async () => {
  await fetchAds(); // Fetch main project ad
  await fetchAndDisplayAds(); // Fetch sidebar ads
  await fetchMeta(); // Fetch project metadata
  await fetchComments(); // Fetch comments

  const accountElement = document.getElementById('account');
  const username = localStorage.getItem('username');
  const params = new URLSearchParams(window.location.search);
  const scrollToId = params.get('commentId');

  if (scrollToId) {
    setTimeout(() => {
      const element = document.getElementById(scrollToId);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth'
        });
        element.style.outline = '2px solid red';
        setTimeout(() => {
          element.style.outline = '';
        }, 2000);
        console.log(`Successfully scrolled to comment ID: ${scrollToId}`);
      } else {
        alert(`Comment with ID '${scrollToId}' not found.`);
        console.error(`Element with ID '${scrollToId}' not found for scrolling after comments loaded.`);
      }
    }, 100);
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
});
