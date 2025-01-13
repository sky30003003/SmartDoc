const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const passport = require('passport');

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    const user = await User.findOne({ email });
    console.log('User found:', user ? 'yes' : 'no');

    if (!user) {
      console.log('No user found with this email');
      return res.status(401).json({ message: 'Email sau parolă incorectă' });
    }

    const isMatch = await user.comparePassword(password);
    console.log('Password match:', isMatch ? 'yes' : 'no');

    if (!isMatch) {
      console.log('Password does not match');
      return res.status(401).json({ message: 'Email sau parolă incorectă' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login successful, token generated');

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Eroare la autentificare' });
  }
});

// Register route (doar pentru admin)
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'user' } = req.body;

    // Verifică dacă există deja un utilizator cu acest email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email-ul este deja înregistrat' });
    }

    // Creează noul utilizator
    const user = new User({
      email,
      password, // va fi criptat automat prin middleware-ul din model
      firstName,
      lastName,
      role,
      organizationId: 'default_org' // sau o valoare specifică organizației
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Eroare la înregistrare' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Utilizator negăsit' });
    }

    // Verifică parola veche
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Parola actuală este incorectă' });
    }

    // Setează noua parolă
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Parola a fost schimbată cu succes' });
  } catch (error) {
    console.error('Eroare la schimbarea parolei:', error);
    res.status(500).json({ message: 'Eroare la schimbarea parolei' });
  }
});

// Adaugă acest endpoint în auth.js
router.get('/verify', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({ valid: true });
});

module.exports = router; 