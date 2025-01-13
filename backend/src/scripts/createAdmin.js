const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectat la MongoDB');

    // Verifică dacă există deja un admin
    const existingAdmin = await User.findOne({ email: 'admin@smartdoc.com' });
    if (existingAdmin) {
      console.log('Admin-ul există deja');
      process.exit(0);
    }

    const adminUser = new User({
      email: 'admin@smartdoc.com',
      password: 'admin123',  // va fi criptat automat
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      organizationId: 'admin_org'
    });

    await adminUser.save();
    console.log('Admin creat cu succes');
    process.exit(0);
  } catch (error) {
    console.error('Eroare:', error);
    process.exit(1);
  }
};

createAdmin(); 