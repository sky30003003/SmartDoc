require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('./config/passport');
const connectDB = require('./config/database');
//const fileDb = require('./services/fileDb');
const path = require('path');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const organizationRoutes = require('./routes/organizationRoutes');
const authRoutes = require('./routes/authRoutes');
const MongoStore = require('connect-mongo');
const documentRoutes = require('./routes/documentRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const collaboratorRoutes = require('./routes/collaboratorRoutes');
const { authenticateToken } = require('./middleware/auth');
const mime = require('mime-types');
const fs = require('fs');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Configurare CORS înainte de toate rutele
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Middleware pentru a gestiona OPTIONS requests
app.options('*', cors());

// Logging middleware pentru toate request-urile
app.use((req, res, next) => {
  if (req.method !== 'OPTIONS') {  // Nu logăm OPTIONS requests
    console.log('Request:', {
      method: req.method,
      path: req.path,
      body: req.body,
      headers: req.headers
    });
  }
  next();
});

// Conectare la MongoDB
connectDB();

// Configurare CORS și alte middleware-uri de bază
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet({
  frameguard: {
    action: 'deny'
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      connectSrc: ["'self'"],
    }
  },
  noSniff: true,
  xssFilter: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(express.json());
app.use(passport.initialize());

// Inițializare bază de date fișiere
//fileDb.initializeDb().catch(console.error);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute
  max: 100 // limită de 100 de request-uri per IP
});

app.use('/api/', limiter);

// Configurare express-session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Debug middleware
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body
  });
  next();
});

// Rute principale
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/collaborators', collaboratorRoutes);
app.use('/api/admin', adminRoutes);

// Logging pentru debug
app.use((req, res, next) => {
  console.log('Request:', {
    method: req.method,
    path: req.path,
    headers: req.headers
  });
  next();
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'A apărut o eroare pe server!' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
}); 

console.log('Auth routes loaded:', Object.keys(authRoutes)); 