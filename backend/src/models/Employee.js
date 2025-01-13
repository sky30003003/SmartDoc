const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: String,
  cnp: {
    type: String,
    required: true,
    unique: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  // Câmpuri pentru semnătura electronică avansată
  digitalSignature: {
    publicKey: String,      // Cheia publică în format PEM
    certificate: String,    // Certificatul auto-semnat în format PEM
    createdAt: Date        // Data generării perechii de chei
  }
});

// Index compus pentru unicitate CNP per organizație
employeeSchema.index({ cnp: 1, organization: 1 }, { unique: true });

module.exports = mongoose.model('Employee', employeeSchema); 