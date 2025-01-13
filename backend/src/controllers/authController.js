const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).populate('organization');
    
    if (!user) {
      return res.status(401).json({ message: 'Email sau parolă incorecte' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email sau parolă incorecte' });
    }

    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role,
        organization: user.organization?._id
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organization: user.organization?._id,
        organizationName: user.organization?.name,
        defaultRoute: user.role === 'org_admin' ? '/org-admin' : '/dashboard'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Eroare la autentificare' });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    console.log('Verify request received, user:', req.user);
    
    const user = await User.findById(req.user.userId)
      .populate('organization')
      .select('-password')
      .lean();

    console.log('Found user:', user);
    
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'Utilizator negăsit' });
    }

    console.log('Sending user data back');
    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organization: user.organization?._id,
        organizationName: user.organization?.name,
        defaultRoute: user.role === 'org_admin' ? '/org-admin' : '/dashboard'
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ message: 'Eroare la verificarea token-ului' });
  }
}; 