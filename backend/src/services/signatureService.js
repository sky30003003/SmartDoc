const crypto = require('crypto');

class SignatureService {
  static generateSignature(documentContent, userId, organizationId, signerInfo) {
    const timestamp = new Date().toISOString();
    const contentHash = crypto
      .createHash('sha256')
      .update(documentContent)
      .digest('hex');

    return {
      hash: contentHash,
      timestamp: timestamp,
      signedBy: userId,
      organizationId: organizationId,
      signerInfo: {
        email: signerInfo.email,
        organizationName: signerInfo.organizationName,
        firstName: signerInfo.firstName,
        lastName: signerInfo.lastName
      },
      id: `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  static verifySignature(documentContent, signature) {
    const currentHash = crypto
      .createHash('sha256')
      .update(documentContent)
      .digest('hex');

    return currentHash === signature.hash;
  }
}

module.exports = SignatureService; 