const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Organization = require('../models/Organization');
const {
  createOrganization,
  getAllOrganizations,
  deleteOrganization,
  getOrganization,
  updateOrganization,
  getOrganizationStats,
  getDashboardStats,
  getStats,
  resetAdminPassword
} = require('../controllers/organizationController');

// Rute specifice - trebuie să fie înaintea rutelor cu parametri
router.get('/stats', authenticateToken, getStats);
router.get('/dashboard-stats', authenticateToken, getDashboardStats);

router.post('/', authenticateToken, createOrganization);
router.get('/', authenticateToken, getAllOrganizations);
router.get('/:id', authenticateToken, getOrganization);
router.put('/:id', authenticateToken, updateOrganization);
router.delete('/:id', authenticateToken, deleteOrganization);
router.get('/:id/stats', authenticateToken, getOrganizationStats);
router.post('/:id/reset-password', authenticateToken, resetAdminPassword);

// Endpoint pentru obținerea setărilor semnăturii
router.get('/:organizationId/signature-settings', authenticateToken, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.organizationId);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită' });
    }
    
    res.json(organization.signatureSettings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Endpoint pentru actualizarea setărilor semnăturii
router.put('/:organizationId/signature-settings', authenticateToken, async (req, res) => {
  try {
    const { printSignature, includeQRCode } = req.body;
    
    const organization = await Organization.findById(req.params.organizationId);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită' });
    }

    organization.signatureSettings = {
      printSignature: printSignature,
      includeQRCode: includeQRCode
    };

    await organization.save();
    res.json(organization.signatureSettings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 