const express = require('express');
const router = express.Router();
const { login, verifyToken } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Verifică că funcțiile există
console.log('Login function:', typeof login);
console.log('VerifyToken function:', typeof verifyToken);

router.post('/login', login);
router.get('/verify', authenticateToken, verifyToken);

module.exports = router; 