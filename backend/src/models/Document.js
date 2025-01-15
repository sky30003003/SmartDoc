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
  fileSize: {
    type: Number,
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
  signatureConfig: [{
    role: {
      type: String,
      required: true,
      enum: ['org_admin', 'employee', 'manager']
    },
    order: {
      type: Number,
      required: true,
      min: 1
    },
    required: {
      type: Boolean,
      default: true
    },
    printOptions: {
      printDigitalSignature: {
        type: Boolean,
        default: true
      },
      includeQRCode: {
        type: Boolean,
        default: true
      }
    }
  }],
  signatureProgress: {
    currentStep: {
      type: Number,
      default: 0,
      min: 0
    },
    totalSteps: {
      type: Number,
      default: 0,
      min: 0
    },
    signatures: [{
      signedAt: {
        type: Date,
        required: true
      },
      signedBy: {
        id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Employee',
          required: true
        },
        role: {
          type: String,
          enum: ['org_admin', 'employee', 'manager'],
          required: true
        },
        organization: {
          type: String,
          required: true
        }
      },
      signatureInfo: {
        documentHash: {
          type: String,
          required: true
        },
        timestamp: {
          type: Date,
          required: true
        },
        signedBy: {
          name: String,
          email: String,
          organization: String,
          role: String
        },
        signatureId: {
          type: String,
          required: true
        }
      }
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
    this.signatureProgress.signatures.some(
      sig => sig.signedBy.role === prevConfig.role
    )
  );
};

// Metodă pentru actualizarea progresului semnăturilor
documentSchema.methods.updateSignatureProgress = function() {
  this.signatureProgress.currentStep = this.signatureProgress.signatures.length;
  return this.save();
};

// Adăugăm o metodă pentru a calcula progresul semnăturilor
documentSchema.methods.getSignatureProgress = function() {
  const total = this.signatureConfig.length;
  const completed = this.signatureProgress?.signatures?.length || 0;
  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  };
};

// Adăugăm o metodă pentru a verifica dacă toate semnăturile sunt complete
documentSchema.methods.isFullySigned = function() {
  return this.signatureProgress?.signatures?.length === this.signatureConfig.length;
};

module.exports = mongoose.model('Document', documentSchema); 