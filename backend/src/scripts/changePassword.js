const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const changePassword = async (email, newPassword) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectat la MongoDB');

    const user = await User.findOne({ email });
    if (!user) {
      console.log('Utilizatorul nu a fost găsit');
      process.exit(1);
    }

    user.password = newPassword;
    await user.save();
    
    console.log('Parola a fost schimbată cu succes');
    process.exit(0);
  } catch (error) {
    console.error('Eroare:', error);
    process.exit(1);
  }
};

// Preia email-ul și noua parolă din argumentele liniei de comandă
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log('Utilizare: node changePassword.js <email> <noua_parola>');
  process.exit(1);
}

changePassword(email, newPassword); 