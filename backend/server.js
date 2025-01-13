require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const organizationRoutes = require('./routes/organizationRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Conectare la MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectat la MongoDB'))
.catch(err => console.error('Eroare conectare MongoDB:', err));

// Middleware-uri
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Middleware pentru logging
app.use('/api/organizations', (req, res, next) => {
  console.log('Request la ruta organizations:', {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers
  });
  next();
});

// Adaugă acest middleware înainte de rutele tale
app.use((req, res, next) => {
  console.log('\n=== INCOMING REQUEST ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Rute
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'A apărut o eroare pe server!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Serverul rulează pe portul ${PORT}`);
}); 