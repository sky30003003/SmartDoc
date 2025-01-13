const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAllDocuments, getAllEmployees, getAllCollaborators } = require('../controllers/adminController');

router.get('/documents', authenticateToken, getAllDocuments);
router.get('/employees', authenticateToken, getAllEmployees);
router.get('/collaborators', authenticateToken, getAllCollaborators);

module.exports = router; 