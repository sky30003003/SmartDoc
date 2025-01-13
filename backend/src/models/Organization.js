const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  signatureSettings: {
    printSignature: {
      type: Boolean,
      default: true,
      required: true
    },
    includeQRCode: {
      type: Boolean,
      default: true,
      required: true
    }
  },
  cuiCnp: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Organization', organizationSchema); 