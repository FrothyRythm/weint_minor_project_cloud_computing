// Dashboard interactions for uploading, displaying, filtering, sharing, previewing, and managing settings
document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const fileList = document.getElementById('file-list');
  const shareList = document.getElementById('share-list');
  const quotaText = document.getElementById('quota-text');
  const storageBarFill = document.getElementById('storage-bar-fill');
  const alertEl = document.getElementById('dashboard-alert');
  const logoutBtn = document.getElementById('logout-btn');

  const navFiles = document.getElementById('nav-files');
  const navShares = document.getElementById('nav-shares');
  const navSettings = document.getElementById('nav-settings');

  const viewFiles = document.getElementById('view-files-container');
  const viewShares = document.getElementById('view-shares-container');
  const viewSettings = document.getElementById('view-settings-container');

  const searchInput = document.getElementById('search-input');
  const filterBtns = document.querySelectorAll('.filter-btn');

  const shareModal = document.getElementById('share-modal');
  const shareExpiryInput = document.getElementById('share-expiry');
  const generateLinkBtn = document.getElementById('generate-link-btn');
  const shareResult = document.getElementById('share-result');
  const shareUrlInput = document.getElementById('share-url');
  const copyLinkBtn = document.getElementById('copy-link-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');

  const previewModal = document.getElementById('preview-modal');
  const previewTitle = document.getElementById('preview-title');
  const previewBody = document.getElementById('preview-body');
  const closePreviewBtn = document.getElementById('close-preview-btn');

  const changePasswordForm = document.getElementById('change-password-form');

  let allFiles = [];
  let currentFilter = 'all';
  let searchQuery = '';
  let activeShareFileId = null;

  function showAlert(msg, isSuccess = false) {
    alertEl.textContent = msg;
    alertEl.className = `alert ${isSuccess ? 'alert-success' : 'alert-error'}`;
    alertEl.style.display = 'block';
    setTimeout(() => { alertEl.style.display = 'none'; }, 6000);
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function showView(viewName) {
    viewFiles.style.display = 'none';
    viewShares.style.display = 'none';
    viewSettings.style.display = 'none';
    navFiles.classList.remove('active');
    navShares.classList.remove('active');
    navSettings.classList.remove('active');

    if (viewName === 'files') {
      viewFiles.style.display = 'block';
      navFiles.classList.add('active');
      loadDashboard();
    } else if (viewName === 'shares') {
      viewShares.style.display = 'block';
      navShares.classList.add('active');
      loadShares();
    } else if (viewName === 'settings') {
      viewSettings.style.display = 'block';
      navSettings.classList.add('active');
    }
  }

  navFiles.addEventListener('click', () => showView('files'));
  navShares.addEventListener('click', () => showView('shares'));
  navSettings.addEventListener('click', () => showView('settings'));

  async function loadDashboard() {
    try {
      const userData = await api.request('/auth/me');
      document.getElementById('welcome-text').textContent = `Welcome back, ${userData.user.username}!`;
      allFiles = await api.request('/files');
      filterAndRenderFiles();
      const usage = await api.request('/files/usage');
      quotaText.textContent = `Usage: ${formatBytes(usage.totalSize)} / 1 GB`;
      const pct = Math.min((usage.totalSize / (1000 * 1024 * 1024)) * 100, 100);
      storageBarFill.style.width = pct + '%';
    } catch (err) {
      window.location.href = 'public/index.html';
    }
  }

  async function loadShares() {
    try {
      const shares = await api.request('/shares');
      renderShares(shares);
    } catch (err) {
      showAlert('Failed to load active shares');
    }
  }

  function filterAndRenderFiles() {
    let filtered = allFiles;
    if (searchQuery) {
      filtered = filtered.filter(f => f.filename.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (currentFilter !== 'all') {
      filtered = filtered.filter(f => {
        const type = f.file_type.toLowerCase();
        const name = f.filename.toLowerCase();
        if (currentFilter === 'pdf') return type.includes('pdf') || name.endsWith('.pdf');
        if (currentFilter === 'image') return type.startsWith('image/');
        if (currentFilter === 'media') return type.startsWith('audio/') || type.startsWith('video/');
        if (currentFilter === 'other') {
          return !type.includes('pdf') && !name.endsWith('.pdf') && !type.startsWith('image/') && !type.startsWith('audio/') && !type.startsWith('video/');
        }
        return true;
      });
    }
    renderFiles(filtered);
  }

  function renderFiles(files) {
    fileList.innerHTML = '';
    if (files.length === 0) {
      fileList.innerHTML = '<p style="grid-column: 1/-1; color: var(--text-secondary); text-align: center; padding: 2rem;">No matching files found.</p>';
      return;
    }
    files.forEach(file => {
      const card = document.createElement('div');
      card.className = 'file-card';
      card.innerHTML = `
        <div class="file-info">
          <div class="file-title">${file.filename}</div>
          <div class="file-meta">${formatBytes(file.file_size)} • ${new Date(file.uploaded_at).toLocaleDateString()}</div>
        </div>
        <div class="file-actions" style="flex-wrap: wrap;">
          <button class="btn-success" data-action="preview" data-id="${file.id}">Preview</button>
          <button class="btn-success" data-action="download" data-id="${file.id}">Download</button>
          <button class="btn-secondary" data-action="share" data-id="${file.id}" style="margin-top: 0;">Share</button>
          <button class="btn-danger" data-action="delete" data-id="${file.id}">Delete</button>
        </div>
      `;
      fileList.appendChild(card);
    });
  }

  function renderShares(shares) {
    shareList.innerHTML = '';
    if (shares.length === 0) {
      shareList.innerHTML = '<p style="grid-column: 1/-1; color: var(--text-secondary); text-align: center; padding: 2rem;">No active share links found.</p>';
      return;
    }
    shares.forEach(share => {
      const card = document.createElement('div');
      card.className = 'file-card';
      const shareUrl = `http://localhost:3000/api/shares/${share.id}`;
      card.innerHTML = `
        <div class="file-info">
          <div class="file-title">${share.filename}</div>
          <div class="file-meta">Views: ${share.view_count} • Expires: ${new Date(share.expires_at).toLocaleString()}</div>
        </div>
        <div class="file-actions" style="margin-top: 1rem; flex-wrap: wrap;">
          <button class="btn-success" data-action="copy-share" data-url="${shareUrl}">Copy Link</button>
          <button class="btn-danger" data-action="revoke-share" data-token="${share.id}">Revoke</button>
        </div>
      `;
      shareList.appendChild(card);
    });
  }

  shareList.addEventListener('click', async (e) => {
    const action = e.target.getAttribute('data-action');
    if (!action) return;

    if (action === 'copy-share') {
      const url = e.target.getAttribute('data-url');
      const tempInput = document.createElement('input');
      tempInput.value = url;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      showAlert('Link copied to clipboard!', true);
    } else if (action === 'revoke-share') {
      const token = e.target.getAttribute('data-token');
      if (confirm('Are you sure you want to revoke this link? It will immediately stop working.')) {
        try {
          await api.request(`/shares/${token}`, { method: 'DELETE' });
          showAlert('Share link revoked successfully', true);
          loadShares();
        } catch (err) {
          showAlert(err.message);
        }
      }
    }
  });

  fileList.addEventListener('click', async (e) => {
    const action = e.target.getAttribute('data-action');
    const id = e.target.getAttribute('data-id');
    if (!action || !id) return;

    if (action === 'preview') {
      try {
        const file = allFiles.find(f => f.id == id);
        if (!file) return;
        previewTitle.textContent = `Preview - ${file.filename}`;
        previewBody.innerHTML = '<p>Generating secure preview...</p>';
        previewModal.style.display = 'flex';

        const data = await api.request(`/files/download-url/${id}`);
        const url = data.downloadUrl;
        const type = file.file_type.toLowerCase();
        const name = file.filename.toLowerCase();

        if (type.startsWith('image/')) {
          previewBody.innerHTML = `<img src="${url}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
        } else if (type.includes('pdf') || name.endsWith('.pdf')) {
          previewBody.innerHTML = `<embed src="${url}" type="application/pdf" width="100%" height="100%">`;
        } else if (type.startsWith('audio/')) {
          previewBody.innerHTML = `<audio controls src="${url}" style="width: 100%;"></audio>`;
        } else if (type.startsWith('video/')) {
          previewBody.innerHTML = `<video controls src="${url}" style="max-width: 100%; max-height: 100%;"></video>`;
        } else if (name.endsWith('.docx')) {
          const arrayBuffer = await fetch(url).then(r => r.arrayBuffer());
          mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
            .then(result => {
              previewBody.innerHTML = `<div style="text-align: left; background: #ffffff; color: #333333; padding: 2rem; border-radius: 8px; width: 100%; min-height: 100%; box-shadow: inset 0 0 10px rgba(0,0,0,0.1); overflow-y: auto;">${result.value}</div>`;
            })
            .catch(err => {
              previewBody.innerHTML = `<p style="color: var(--danger-color);">Failed to parse DOCX document: ${err.message}</p>`;
            });
        } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
          const arrayBuffer = await fetch(url).then(r => r.arrayBuffer());
          const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const htmlContent = XLSX.utils.sheet_to_html(worksheet);
          previewBody.innerHTML = `<div style="text-align: left; background: #ffffff; color: #333333; padding: 2rem; border-radius: 8px; width: 100%; min-height: 100%; box-shadow: inset 0 0 10px rgba(0,0,0,0.1); overflow: auto; font-family: sans-serif;">${htmlContent}</div>`;
        } else if (name.endsWith('.pptx') || name.endsWith('.ppt')) {
          const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          if (isLocal) {
            previewBody.innerHTML = `<div style="text-align: center; padding: 2rem;"><p style="margin-bottom: 1.5rem;">PowerPoint previews require public URL access (Microsoft Office Web Viewer). Since you are running locally on localhost, please download the file directly to view it.</p><a href="${url}" download="${file.filename}" class="btn-success" style="padding: 0.5rem 1rem; border-radius: 8px; text-decoration: none; display: inline-block;">Download Presentation</a></div>`;
          } else {
            const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
            previewBody.innerHTML = `<iframe src="${officeUrl}" width="100%" height="100%" frameborder="0"></iframe>`;
          }
        } else if (type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.json') || name.endsWith('.js') || name.endsWith('.sql') || name.endsWith('.html') || name.endsWith('.css') || name.endsWith('.md')) {
          const content = await fetch(url).then(r => r.text()).catch(() => '');
          const escapedContent = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          previewBody.innerHTML = `<pre style="width: 100%; height: 100%; font-family: monospace; white-space: pre-wrap; font-size: 0.875rem; text-align: left;">${escapedContent}</pre>`;
        } else {
          previewBody.innerHTML = `<div style="text-align: center;"><p style="margin-bottom: 1rem;">File type (${file.file_type}) cannot be previewed directly on the site.</p><a href="${url}" download="${file.filename}" class="btn-success" style="padding: 0.5rem 1rem; border-radius: 8px; text-decoration: none; display: inline-block;">Download File</a></div>`;
        }
      } catch (err) {
        previewBody.innerHTML = `<p style="color: var(--danger-color);">Error opening preview: ${err.message}</p>`;
      }
    } else if (action === 'download') {
      try {
        const data = await api.request(`/files/download-url/${id}`);
        const a = document.createElement('a');
        a.href = data.downloadUrl;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err) {
        showAlert(err.message);
      }
    } else if (action === 'delete') {
      if (confirm('Are you sure you want to delete this file?')) {
        try {
          await api.request(`/files/${id}`, { method: 'DELETE' });
          showAlert('File deleted successfully', true);
          loadDashboard();
        } catch (err) {
          showAlert(err.message);
        }
      }
    } else if (action === 'share') {
      activeShareFileId = id;
      shareResult.style.display = 'none';
      shareExpiryInput.value = '60';
      shareModal.style.display = 'flex';
    }
  });

  closePreviewBtn.addEventListener('click', () => {
    previewModal.style.display = 'none';
    previewBody.innerHTML = '';
  });

  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;

    try {
      const res = await api.request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      showAlert(res.message, true);
      changePasswordForm.reset();
    } catch (err) {
      showAlert(err.message);
    }
  });

  generateLinkBtn.addEventListener('click', async () => {
    const mins = parseInt(shareExpiryInput.value, 10);
    try {
      const data = await api.request('/shares', {
        method: 'POST',
        body: JSON.stringify({ fileId: activeShareFileId, expiresInMinutes: mins })
      });
      const publicUrl = `http://localhost:3000/api/shares/${data.shareToken}`;
      shareUrlInput.value = publicUrl;
      shareResult.style.display = 'block';
    } catch (err) {
      showAlert(err.message);
    }
  });

  copyLinkBtn.addEventListener('click', () => {
    shareUrlInput.select();
    document.execCommand('copy');
    showAlert('Link copied to clipboard!', true);
  });

  closeModalBtn.addEventListener('click', () => {
    shareModal.style.display = 'none';
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await api.request('/auth/logout', { method: 'POST' });
      window.location.href = 'public/index.html';
    } catch (err) {
      showAlert('Logout failed');
    }
  });

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    filterAndRenderFiles();
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      filterAndRenderFiles();
    });
  });

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--accent-color)';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--border-color)';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-color)';
    if (e.dataTransfer.files.length > 0) {
      uploadMultipleFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      uploadMultipleFiles(e.target.files);
    }
  });

  async function uploadMultipleFiles(files) {
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    let uploadedCount = 0;
    const filesArray = Array.from(files);
    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      try {
        await new Promise((resolve, reject) => {
          const filename = file.name;
          const fileType = file.type || 'application/octet-stream';
          const fileSize = file.size;
          api.request('/files/upload-url', {
            method: 'POST',
            body: JSON.stringify({ filename, fileType, fileSize })
          }).then(data => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', data.uploadUrl, true);
            xhr.setRequestHeader('Content-Type', fileType);
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const totalPercent = ((uploadedCount + (event.loaded / event.total)) / filesArray.length) * 100;
                progressBar.style.width = totalPercent + '%';
              }
            };
            xhr.onload = () => {
              if (xhr.status === 200) {
                api.request('/files/confirm-upload', {
                  method: 'POST',
                  body: JSON.stringify({ filename, s3Key: data.s3Key, fileSize, fileType })
                }).then(() => {
                  uploadedCount++;
                  resolve();
                }).catch(reject);
              } else {
                reject(new Error('Upload status ' + xhr.status));
              }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(file);
          }).catch(reject);
        });
      } catch (err) {
        showAlert(`Failed to upload "${file.name}": ${err.message}`);
      }
    }
    progressBar.style.width = '100%';
    setTimeout(() => { progressContainer.style.display = 'none'; }, 1000);
    showAlert(`Successfully uploaded ${uploadedCount} file(s)`, true);
    loadDashboard();
  }

  loadDashboard();
});
