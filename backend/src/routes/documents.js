const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileDb = require('../services/fileDb');
const SignatureService = require('../services/signatureService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Adaugă document nou pentru organizație
router.post('/', upload.single('file'), async (req, res) => {
  console.log('POST /documents - Start');
  console.log('Headers:', req.headers);
  console.log('Auth:', req.auth);
  
  try {
    if (!req.file) {
      console.error('Nu a fost primit niciun fișier');
      return res.status(400).json({ error: 'Nu a fost primit niciun fișier' });
    }

    console.log('File primit:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer ? 'Buffer prezent' : 'Buffer lipsă'
    });

    const documentData = {
      title: req.file.originalname,
      description: `Importat la ${new Date().toLocaleString()}`,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      fileContent: req.file.buffer.toString('base64')
    };

    console.log('Document pregătit pentru salvare');

    const result = await fileDb.addOrganizationDocument(
      req.auth.organizationId, 
      documentData
    );
    
    console.log('Document salvat cu succes');
    res.json(result);
  } catch (error) {
    console.error('Eroare la procesarea documentului:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Obține toate documentele organizației
router.get('/', async (req, res) => {
  try {
    const documents = await fileDb.getOrganizationDocuments(req.auth.organizationId);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obține documentele unui angajat
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const documents = await fileDb.getEmployeeDocuments(
      req.auth.organizationId,
      req.params.employeeId
    );
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ștergere document
router.delete('/:id', async (req, res) => {
  try {
    await fileDb.deleteDocument(req.auth.organizationId, req.params.id);
    res.json({ message: 'Document șters cu succes' });
  } catch (error) {
    console.error('Eroare la ștergerea documentului:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rută pentru semnarea documentului
router.post('/:id/sign', async (req, res) => {
  try {
    const document = await fileDb.signDocument(
      req.auth.organizationId,
      req.params.id,
      req.auth.sub
    );
    
    res.json(document);
  } catch (error) {
    console.error('Eroare la semnarea documentului:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rută pentru verificarea semnăturilor
router.get('/:id/verify', async (req, res) => {
  try {
    const result = await fileDb.verifyDocumentSignature(
      req.auth.organizationId,
      req.params.id
    );
    res.json(result);
  } catch (error) {
    console.error('Eroare la verificarea semnăturii:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rută pentru ștergerea semnăturii
router.delete('/:id/signatures/:signatureId', async (req, res) => {
  try {
    const document = await fileDb.deleteSignature(
      req.auth.organizationId,
      req.params.id,
      req.params.signatureId,
      req.auth.sub
    );
    res.json(document);
  } catch (error) {
    console.error('Eroare la ștergerea semnăturii:', error);
    res.status(error.message.includes('Unauthorized') ? 403 : 500)
      .json({ error: error.message });
  }
});

module.exports = router; 