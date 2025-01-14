const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  cuiCnp: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  signatureSettings: {
    printSignature: {
      type: Boolean,
      default: true
    },
    includeQRCode: {
      type: Boolean,
      default: true
    }
  },
  certificateSettings: {
    validityPeriods: {
      standard: {
        years: {
          type: Number,
          default: 10,
          min: 1,
          max: 100
        }
      },
      extended: {
        years: {
          type: Number,
          default: 100,
          min: 10,
          max: 1000
        }
      },
      temporary: {
        days: {
          type: Number,
          default: 180,
          min: 1,
          max: 365
        }
      }
    },
    defaultType: {
      type: String,
      enum: ['standard', 'extended', 'temporary'],
      default: 'standard'
    }
  },
  employees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }],
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }]
}, {
  timestamps: true
});

// Adăugăm doar indecșii pentru referințe
organizationSchema.index({ employees: 1 });
organizationSchema.index({ admins: 1 });
organizationSchema.index({ collaborators: 1 });

module.exports = mongoose.model('Organization', organizationSchema); 