const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAllCollaborators, createCollaborator, deleteCollaborator } = require('../controllers/collaboratorController');

router.get('/', authenticateToken, getAllCollaborators);
router.post('/', authenticateToken, createCollaborator);
router.delete('/:id', authenticateToken, deleteCollaborator);

module.exports = router; 