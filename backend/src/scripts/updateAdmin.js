const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const User = require('../models/User');
    
    await User.updateOne(
      { email: 'admin@smartdoc.com' },
      { $set: { status: 'active' } }
    );
    
    console.log('Admin actualizat cu succes');
    process.exit(0);
  })
  .catch(err => {
    console.error('Eroare:', err);
    process.exit(1);
  }); 