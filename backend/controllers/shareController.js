// Share controller to create and resolve public shareable links for files
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const s3Client = require('../config/aws');
const db = require('../config/db');
require('dotenv').config();

const BUCKET = process.env.S3_BUCKET_NAME || '';

exports.createShare = (req, res) => {
  const { fileId, expiresInMinutes } = req.body;
  if (!fileId) return res.status(400).json({ error: 'fileId is required' });
  db.get('SELECT * FROM files WHERE id = ? AND user_id = ?', [fileId, req.user.id], (err, file) => {
    if (err || !file) return res.status(404).json({ error: 'File not found or access denied' });
    const token = uuidv4();
    const expiry = new Date(Date.now() + (expiresInMinutes || 60) * 60 * 1000).toISOString();
    db.run('INSERT INTO shares (id, file_id, expires_at) VALUES (?, ?, ?)', [token, fileId, expiry], (insErr) => {
      if (insErr) return res.status(500).json({ error: 'Failed to create share link' });
      res.json({ shareToken: token, expiresAt: expiry });
    });
  });
};

exports.resolveShare = (req, res) => {
  const token = req.params.token;
  db.get(
    'SELECT shares.*, files.s3_key, files.filename FROM shares JOIN files ON shares.file_id = files.id WHERE shares.id = ?',
    [token],
    (err, share) => {
      if (err || !share) return res.status(404).json({ error: 'Share link not found' });
      if (new Date(share.expires_at) < new Date()) return res.status(410).json({ error: 'Share link has expired' });
      db.run('UPDATE shares SET view_count = view_count + 1 WHERE id = ?', [token], async (updErr) => {
        try {
          const command = new GetObjectCommand({ Bucket: BUCKET, Key: share.s3_key });
          const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
          res.redirect(downloadUrl);
        } catch (s3Err) {
          res.status(500).json({ error: 'Failed to generate download URL' });
        }
      });
    }
  );
};
