const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAllDocuments, uploadDocument, deleteDocument, downloadDocument, sendToSign, getSigningDetails, signDocument, downloadDocumentForSigning, verifySignature, bulkDelete, signDocumentAsAdmin } = require('../controllers/documentController');

// Rute publice pentru semnarea documentelor (nu necesită autentificare)
router.get('/:id/sign/:employeeId/details', getSigningDetails);
router.post('/:id/sign/:employeeId', signDocument);
router.get('/:id/sign/:employeeId/download', downloadDocumentForSigning);

// Rute protejate (necesită autentificare)
router.use(authenticateToken);

// Rute pentru documente
router.get('/', getAllDocuments);
router.post('/', uploadDocument);
router.delete('/:id', deleteDocument);
router.get('/download/:id', downloadDocument);
router.post('/:id/send-to-sign', sendToSign);
router.post('/bulk-delete', bulkDelete);
router.post('/:id/sign-admin', signDocumentAsAdmin);

// Rută pentru verificarea semnăturii
router.get('/:id/verify/:signatureId', verifySignature);

module.exports = router; 