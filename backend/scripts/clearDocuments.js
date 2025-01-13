const mongoose = require('mongoose');
const Document = require('../models/Document');
require('dotenv').config();

const clearDocuments = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    await Document.deleteMany({});
    console.log('All documents deleted from database');
    
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error:', error);
  }
};

clearDocuments(); 