const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAllDocuments, uploadDocument, deleteDocument, downloadDocument, sendToSign, getSigningDetails, signDocument, downloadDocumentForSigning, verifySignature, bulkDelete } = require('../controllers/documentController');

router.get('/', authenticateToken, getAllDocuments);
router.post('/', authenticateToken, uploadDocument);
router.delete('/:id', authenticateToken, deleteDocument);
router.get('/download/:id', authenticateToken, downloadDocument);
router.post('/:id/send-to-sign', authenticateToken, sendToSign);
router.post('/bulk-delete', authenticateToken, bulkDelete);

// Rute publice pentru semnarea documentelor
router.get('/:id/sign/:employeeId/details', getSigningDetails);
router.post('/:id/sign/:employeeId', signDocument);
router.get('/:id/sign/:employeeId/download', downloadDocumentForSigning);

// Rută pentru verificarea semnăturii
router.get('/:id/verify/:employeeId', authenticateToken, verifySignature);

module.exports = router; 