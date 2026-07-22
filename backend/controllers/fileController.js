// File controller managing S3 presigned URLs, metadata, deletion, and usage metrics
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/aws');
const db = require('../config/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BUCKET = process.env.S3_BUCKET_NAME || '';

exports.listFiles = (req, res) => {
  db.all('SELECT * FROM files WHERE user_id = ? ORDER BY uploaded_at DESC', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database query failed' });
    res.json(rows);
  });
};

exports.getUploadUrl = async (req, res) => {
  const { filename, fileType, fileSize } = req.body;
  if (!filename || !fileType || !fileSize) return res.status(400).json({ error: 'Filename, fileType, and fileSize are required' });
  db.get('SELECT SUM(file_size) as totalSize FROM files WHERE user_id = ?', [req.user.id], async (err, row) => {
    if (err) return res.status(500).json({ error: 'Database query failed' });
    if ((row.totalSize || 0) + Number(fileSize) > 1000 * 1024 * 1024) {
      return res.status(400).json({ error: 'Storage quota limit (1 GB) exceeded' });
    }
    const s3Key = `${req.user.id}/${Date.now()}_${filename}`;
    try {
      const command = new PutObjectCommand({ Bucket: BUCKET, Key: s3Key, ContentType: fileType });
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      res.json({ uploadUrl, s3Key });
    } catch (s3Err) {
      console.error('S3 pre-signing error:', s3Err);
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  });
};

exports.confirmUpload = (req, res) => {
  const { filename, s3Key, fileSize, fileType } = req.body;
  if (!filename || !s3Key || !fileSize || !fileType) return res.status(400).json({ error: 'All file metadata fields are required' });
  db.run(
    'INSERT INTO files (filename, s3_key, file_size, file_type, user_id) VALUES (?, ?, ?, ?, ?)',
    [filename, s3Key, fileSize, fileType, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: 'Failed to save file metadata' });
      res.status(201).json({ message: 'File uploaded successfully', fileId: this.lastID });
    }
  );
};

exports.getDownloadUrl = (req, res) => {
  const fileId = req.params.id;
  db.get('SELECT * FROM files WHERE id = ?', [fileId], async (err, file) => {
    if (err || !file) return res.status(404).json({ error: 'File not found' });
    if (file.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    try {
      const command = new GetObjectCommand({ Bucket: BUCKET, Key: file.s3_key });
      const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      res.json({ downloadUrl, filename: file.filename });
    } catch (s3Err) {
      console.error('S3 download-url error:', s3Err);
      res.status(500).json({ error: 'Failed to generate download URL' });
    }
  });
};

exports.deleteFile = (req, res) => {
  const fileId = req.params.id;
  db.get('SELECT * FROM files WHERE id = ?', [fileId], async (err, file) => {
    if (err || !file) return res.status(404).json({ error: 'File not found' });
    if (file.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    try {
      const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: file.s3_key });
      await s3Client.send(command);
      db.run('DELETE FROM files WHERE id = ?', [fileId], (delErr) => {
        if (delErr) return res.status(500).json({ error: 'Failed to delete metadata' });
        res.json({ message: 'File deleted successfully' });
      });
    } catch (s3Err) {
      console.error('S3 delete-file error:', s3Err);
      res.status(500).json({ error: 'Failed to delete file from S3' });
    }
  });
};

exports.getUsage = (req, res) => {
  db.get('SELECT SUM(file_size) as totalSize FROM files WHERE user_id = ?', [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Failed to compute usage' });
    res.json({ totalSize: row.totalSize || 0 });
  });
};
