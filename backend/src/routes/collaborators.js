const express = require('express');
const router = express.Router();
const fileDb = require('../services/fileDb');
const { validateCollaborator } = require('../middleware/validation');

// Obține lista colaboratorilor
router.get('/', async (req, res) => {
  try {
    const collaborators = await fileDb.getCollaborators(req.auth.organizationId);
    res.json(collaborators);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Adaugă un colaborator nou
router.post('/', validateCollaborator, async (req, res) => {
  try {
    console.log('Încercare adăugare colaborator:', {
      organizationId: req.auth.organizationId,
      data: req.body,
      auth: req.auth,
      headers: req.headers
    });

    const collaborator = await fileDb.addCollaborator(
      req.auth.organizationId,
      req.body
    );
    console.log('Colaborator adăugat cu succes:', collaborator);
    res.status(201).json(collaborator);
  } catch (error) {
    console.error('Eroare completă la adăugarea colaboratorului:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: error.message });
  }
});

// Actualizează un colaborator
router.put('/:id', validateCollaborator, async (req, res) => {
  try {
    const collaborator = await fileDb.updateCollaborator(
      req.auth.organizationId,
      req.params.id,
      req.body
    );
    if (!collaborator) {
      return res.status(404).json({ error: 'Colaborator negăsit' });
    }
    res.json(collaborator);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Șterge un colaborator
router.delete('/:id', async (req, res) => {
  try {
    await fileDb.deleteCollaborator(req.auth.organizationId, req.params.id);
    res.json({ message: 'Colaborator șters cu succes!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 