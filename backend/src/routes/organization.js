const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');

// GET /api/organization - Obține detaliile organizației
router.get('/', async (req, res) => {
  try {
    const organization = await Organization.findOne({ userId: req.user.id });
    
    if (!organization) {
      // Creăm o organizație nouă pentru utilizator
      const newOrganization = new Organization({
        userId: req.user.id,
        name: 'Organizație nouă',
        email: req.user.email,
        status: 'active'
      });
      
      await newOrganization.save();
      return res.json(newOrganization);
    }
    
    res.json(organization);
  } catch (error) {
    console.error('Eroare la obținerea detaliilor organizației:', error);
    res.status(500).json({ error: 'Eroare la obținerea detaliilor organizației' });
  }
});

// PUT /api/organization - Actualizează detaliile organizației
router.put('/', async (req, res) => {
  try {
    const { name, email, phone, address, logo } = req.body;
    
    let organization = await Organization.findOne({ userId: req.user.id });
    
    if (!organization) {
      organization = new Organization({
        userId: req.user.id,
        name,
        email,
        phone,
        address,
        logo,
        status: 'active'
      });
    } else {
      organization.name = name || organization.name;
      organization.email = email || organization.email;
      organization.phone = phone || organization.phone;
      organization.address = address || organization.address;
      organization.logo = logo || organization.logo;
    }
    
    await organization.save();
    res.json(organization);
  } catch (error) {
    console.error('Eroare la actualizarea organizației:', error);
    res.status(500).json({ error: 'Eroare la actualizarea organizației' });
  }
});

// POST /api/organization/logo - Încarcă logo-ul organizației
router.post('/logo', async (req, res) => {
  try {
    if (!req.files || !req.files.logo) {
      return res.status(400).json({ error: 'Nu a fost furnizat niciun fișier' });
    }

    const organization = await Organization.findOne({ userId: req.user.id });
    if (!organization) {
      return res.status(404).json({ error: 'Organizație negăsită' });
    }

    const logoFile = req.files.logo;
    const logoPath = `/uploads/logos/${organization._id}-${Date.now()}-${logoFile.name}`;
    
    await logoFile.mv(`./public${logoPath}`);
    
    organization.logo = logoPath;
    await organization.save();
    
    res.json(organization);
  } catch (error) {
    console.error('Eroare la încărcarea logo-ului:', error);
    res.status(500).json({ error: 'Eroare la încărcarea logo-ului' });
  }
});

module.exports = router; 