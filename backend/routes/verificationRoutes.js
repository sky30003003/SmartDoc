const express = require('express');
const router = express.Router();
const Document = require('../models/document');
const { verifySignature } = require('../utils/signatureUtils');

// Rută publică pentru verificarea semnăturii
router.get('/verify-signature/:documentId/:signatureId', async (req, res) => {
  try {
    const { documentId, signatureId } = req.params;
    
    // Găsim documentul
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document negăsit' });
    }

    // Găsim semnătura specifică în copiile documentului
    const employeeCopy = document.employeeCopies.find(
      copy => copy.signature && copy.signature._id.toString() === signatureId
    );

    if (!employeeCopy || !employeeCopy.signature) {
      return res.status(404).json({ error: 'Semnătură negăsită' });
    }

    // Verificăm semnătura
    const verificationResult = await verifySignature(document, employeeCopy);

    // Returnăm rezultatul verificării împreună cu detaliile semnatarului
    res.json({
      isValid: verificationResult.isValid,
      error: verificationResult.error,
      signerName: employeeCopy.employeeName,
      signerEmail: employeeCopy.employee,
      organization: document.organization.name,
      signedAt: employeeCopy.signature.signedAt
    });

  } catch (error) {
    console.error('Eroare la verificarea semnăturii:', error);
    res.status(500).json({ error: 'Eroare internă la verificarea semnăturii' });
  }
});

module.exports = router; 