const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Verificăm dacă modelul există deja
if (mongoose.models.User) {
  module.exports = mongoose.models.User;
  return;
}

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: String,
  lastName: String,
  role: {
    type: String,
    enum: ['admin', 'org_admin', 'employee'],
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  status: {
    type: String,
    enum: ['pending', 'active'],
    default: 'active'
  }
});

// Criptare parola înainte de salvare
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Metodă pentru verificarea parolei
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('Comparing passwords:');
    console.log('Candidate password:', candidatePassword);
    console.log('Stored hash:', this.password);
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('Password match result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    throw error;
  }
};

module.exports = mongoose.model('User', userSchema); 