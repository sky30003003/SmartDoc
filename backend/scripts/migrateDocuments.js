const Document = require('../models/Document');
const mongoose = require('mongoose');

const migrateDocuments = async () => {
  const documents = await Document.find();
  
  for (const doc of documents) {
    // Adăugăm câmpurile lipsă
    doc.title = doc.originalName || 'Document necunoscut';
    doc.fileType = 'application/pdf';  // sau alt tip implicit
    await doc.save();
  }
}; 