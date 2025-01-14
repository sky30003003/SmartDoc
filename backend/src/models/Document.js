const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  signatureProgress: {
    currentStep: {
      type: Number,
      default: 0
    },
    totalSteps: {
      type: Number,
      default: 0
    },
    completedSignatures: [{
      role: String,
      signedAt: Date,
      signedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
      },
      order: Number
    }]
  },
  employeeCopies: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    path: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'pending_signature', 'signed', 'rejected'],
      default: 'pending'
    },
    signedAt: Date,
    documentHash: String,
    signatureId: String,
    signatureMetadata: {
      version: String,
      signatureType: String,
      signatureFormat: String,
      signatureLevel: String,
      signatureAlgorithm: String,
      certificateInfo: {
        subject: {
          commonName: String,
          organization: String,
          email: String
        },
        issuer: {
          commonName: String,
          organization: String
        },
        validFrom: Date,
        validTo: Date,
        serialNumber: String
      },
      timestamps: [{
        timestamp: Date,
        documentHash: String,
        timestampHash: String
      }],
      revocationInfo: {
        status: {
          type: String,
          enum: ['valid', 'revoked', 'unknown'],
          default: 'valid'
        },
        revocationDate: Date,
        reason: String
      },
      customData: mongoose.Schema.Types.Mixed
    }
  }],
  signatureConfig: [{
    role: {
      type: String,
      required: true
    },
    order: {
      type: Number,
      default: null
    },
    required: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Adăugăm indecși pentru căutare eficientă
documentSchema.index({ organizationId: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ 'employeeCopies.employee': 1 });
documentSchema.index({ 'employeeCopies.signatureId': 1 });
documentSchema.index({ 'signatureProgress.currentStep': 1 });

// Metodă pentru verificarea dacă un angajat poate semna
documentSchema.methods.canSign = async function(employeeId) {
  const employee = await mongoose.model('Employee').findById(employeeId);
  if (!employee) return false;

  // Verificăm dacă angajatul are o copie a documentului
  const employeeCopy = this.employeeCopies.find(
    copy => copy.employee.toString() === employeeId
  );
  if (!employeeCopy) return false;

  // Verificăm dacă documentul a fost deja semnat de acest angajat
  if (employeeCopy.status === 'signed') return false;

  // Găsim configurația de semnătură pentru rolul angajatului
  const signatureConfig = this.signatureConfig.find(
    config => config.role === employee.role
  );
  if (!signatureConfig) return false;

  // Verificăm dacă toate semnăturile anterioare sunt complete
  const previousSignatures = this.signatureConfig.filter(
    config => config.order < signatureConfig.order
  );

  return previousSignatures.every(prevConfig => 
    this.signatureProgress.completedSignatures.some(
      sig => sig.role === prevConfig.role
    )
  );
};

// Metodă pentru actualizarea progresului semnăturilor
documentSchema.methods.updateSignatureProgress = function() {
  this.signatureProgress.currentStep = this.signatureProgress.completedSignatures.length;
  return this.save();
};

module.exports = mongoose.model('Document', documentSchema); 