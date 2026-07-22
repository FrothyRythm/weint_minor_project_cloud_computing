// Dashboard interactions for uploading, displaying, and sharing files
document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const fileList = document.getElementById('file-list');
  const quotaText = document.getElementById('quota-text');
  const alertEl = document.getElementById('dashboard-alert');
  const logoutBtn = document.getElementById('logout-btn');

  const shareModal = document.getElementById('share-modal');
  const shareExpiryInput = document.getElementById('share-expiry');
  const generateLinkBtn = document.getElementById('generate-link-btn');
  const shareResult = document.getElementById('share-result');
  const shareUrlInput = document.getElementById('share-url');
  const copyLinkBtn = document.getElementById('copy-link-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');

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

  async function loadDashboard() {
    try {
      const files = await api.request('/files');
      renderFiles(files);
      const usage = await api.request('/files/usage');
      quotaText.textContent = `Usage: ${formatBytes(usage.totalSize)}`;
    } catch (err) {
      window.location.href = 'public/index.html';
    }
  }

  function renderFiles(files) {
    fileList.innerHTML = '';
    if (files.length === 0) {
      fileList.innerHTML = '<p style="grid-column: 1/-1; color: var(--text-secondary);">No files uploaded yet.</p>';
      return;
    }
    files.forEach(file => {
      const card = document.createElement('div');
      card.className = 'file-card';
      card.innerHTML = `
        <div class="file-info">
          <h4>${file.filename}</h4>
          <p>${formatBytes(file.file_size)} • ${new Date(file.uploaded_at).toLocaleDateString()}</p>
        </div>
        <div class="file-actions">
          <button class="btn-success" data-action="download" data-id="${file.id}">Download</button>
          <button class="btn-secondary" data-action="share" data-id="${file.id}">Share</button>
          <button class="btn-danger" data-action="delete" data-id="${file.id}">Delete</button>
        </div>
      `;
      fileList.appendChild(card);
    });
  }

  fileList.addEventListener('click', async (e) => {
    const action = e.target.getAttribute('data-action');
    const id = e.target.getAttribute('data-id');
    if (!action || !id) return;

    if (action === 'download') {
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
      uploadFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
    }
  });

  function uploadFile(file) {
    const filename = file.name;
    const fileType = file.type || 'application/octet-stream';
    const fileSize = file.size;

    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';

    api.request('/files/upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename, fileType, fileSize })
    }).then(data => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', data.uploadUrl, true);
      xhr.setRequestHeader('Content-Type', fileType);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = (event.loaded / event.total) * 100;
          progressBar.style.width = percent + '%';
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          api.request('/files/confirm-upload', {
            method: 'POST',
            body: JSON.stringify({ filename, s3Key: data.s3Key, fileSize, fileType })
          }).then(() => {
            progressBar.style.width = '100%';
            setTimeout(() => { progressContainer.style.display = 'none'; }, 1000);
            showAlert('Upload complete!', true);
            loadDashboard();
          }).catch(err => {
            progressContainer.style.display = 'none';
            showAlert('Failed to confirm upload: ' + err.message);
          });
        } else {
          progressContainer.style.display = 'none';
          showAlert('Failed to upload file to storage provider.');
        }
      };

      xhr.onerror = () => {
        progressContainer.style.display = 'none';
        showAlert('Network error during upload.');
      };

      xhr.send(file);
    }).catch(err => {
      progressContainer.style.display = 'none';
      showAlert('Failed to initialize upload: ' + err.message);
    });
  }

  loadDashboard();
});
