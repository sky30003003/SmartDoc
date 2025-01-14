const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
    console.log('\n=== Authentication Middleware ===');
    console.log('Headers:', req.headers);
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    
    const authHeader = req.headers['authorization'];
    console.log('Authorization header:', authHeader);
    
    const token = authHeader && authHeader.split(' ')[1];
    console.log('Extracted token:', token);

    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ message: 'Token lipsă' });
    }

    console.log('JWT Secret:', process.env.JWT_SECRET ? 'Present' : 'Missing');
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.log('Token verification error:', err);
        return res.status(403).json({ message: 'Token invalid' });
      }

      console.log('Decoded user:', user);
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Complete auth error:', error);
    res.status(500).json({ message: 'Eroare la autentificare' });
  }
};

// Middleware pentru verificarea rolului de admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Acces interzis. Doar administratorii pot efectua această acțiune.' 
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  isAdmin
}; 