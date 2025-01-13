const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  originalName: String,
  fileUrl: String,
  fileType: String,
  fileSize: Number,
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  employeeCopies: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    path: String,
    status: {
      type: String,
      enum: ['pending', 'pending_signature', 'signed'],
      default: 'pending'
    },
    sentAt: Date,
    signedAt: Date,
    documentHash: String,
    digitalSignature: String,
    publicKey: String,
    signatureTimestamp: Date
  }]
});

documentSchema.index({ title: 1, organization: 1 }, { unique: true });

module.exports = mongoose.model('Document', documentSchema); 