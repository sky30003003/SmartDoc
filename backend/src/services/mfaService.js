const crypto = require('crypto');
const emailService = require('./emailService');

class MFAService {
  constructor() {
    // Stocăm codurile temporar în memorie
    // În producție ar trebui să folosim Redis sau altă soluție de caching
    this.verificationCodes = new Map();
  }

  generateCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  async createAndSendCode(organizationId, email) {
    const code = this.generateCode();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minute

    // Salvăm codul și timpul de expirare
    this.verificationCodes.set(organizationId, {
      code,
      expiresAt
    });

    // Trimitem codul pe email
    await emailService.sendVerificationCode(email, code);
  }

  verifyCode(organizationId, submittedCode) {
    const storedData = this.verificationCodes.get(organizationId);
    
    if (!storedData) {
      return false;
    }

    if (Date.now() > storedData.expiresAt) {
      this.verificationCodes.delete(organizationId);
      return false;
    }

    if (storedData.code !== submittedCode) {
      return false;
    }

    // Ștergem codul după verificare
    this.verificationCodes.delete(organizationId);
    return true;
  }
}

module.exports = new MFAService(); 