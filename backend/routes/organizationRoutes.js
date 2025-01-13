const express = require('express');
const router = express.Router();
const Organization = require('../src/models/Organization');
const { authenticateToken } = require('../src/middleware/auth');

// GET signature settings
router.get('/:organizationId/signature-settings', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching settings for organization:', req.params.organizationId);
    console.log('Organization model:', Organization);
    
    const organization = await Organization.findById(req.params.organizationId);
    console.log('Found organization:', organization);
    
    if (!organization) {
      console.log('Organization not found');
      return res.status(404).json({ message: 'Organizația nu a fost găsită' });
    }

    // Return default settings if not set
    const settings = organization.signatureSettings || {
      printSignature: true,
      includeQRCode: true
    };
    console.log('Returning settings:', settings);

    res.json(settings);
  } catch (error) {
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: error.message || 'Eroare la încărcarea setărilor',
      details: error.stack
    });
  }
});

// UPDATE signature settings
router.put('/:organizationId/signature-settings', authenticateToken, async (req, res) => {
  try {
    console.log('Updating settings for organization:', req.params.organizationId);
    console.log('New settings:', req.body);
    
    const { printSignature, includeQRCode } = req.body;
    
    const organization = await Organization.findById(req.params.organizationId);
    console.log('Found organization:', organization);
    
    if (!organization) {
      console.log('Organization not found');
      return res.status(404).json({ message: 'Organizația nu a fost găsită' });
    }

    organization.signatureSettings = {
      printSignature,
      includeQRCode
    };

    await organization.save();
    console.log('Settings updated successfully');
    
    res.json(organization.signatureSettings);
  } catch (error) {
    console.error('Detailed error:', error);
    res.status(500).json({ message: error.message || 'Eroare la actualizarea setărilor' });
  }
});

module.exports = router; 