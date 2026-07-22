// Authentication controller handling signup, signin, and signout
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

exports.register = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: 'Error hashing password' });
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], function(dbErr) {
      if (dbErr) return res.status(400).json({ error: 'Username already exists' });
      res.status(201).json({ message: 'User registered successfully', userId: this.lastID });
    });
  });
};

exports.login = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'Invalid username or password' });
    bcrypt.compare(password, user.password, (cmpErr, isMatch) => {
      if (cmpErr || !isMatch) return res.status(400).json({ error: 'Invalid username or password' });
      const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '7d' });
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.json({ message: 'Login successful', user: { id: user.id, username: user.username }, token });
    });
  });
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};

exports.changePassword = (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'All fields are required' });
  db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'User not found' });
    bcrypt.compare(currentPassword, user.password, (cmpErr, isMatch) => {
      if (cmpErr || !isMatch) return res.status(400).json({ error: 'Invalid current password' });
      bcrypt.hash(newPassword, 10, (hashErr, hash) => {
        if (hashErr) return res.status(500).json({ error: 'Error hashing password' });
        db.run('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id], (updErr) => {
          if (updErr) return res.status(500).json({ error: 'Failed to update password' });
          res.json({ message: 'Password updated successfully' });
        });
      });
    });
  });
};

exports.getMe = (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username } });
};
