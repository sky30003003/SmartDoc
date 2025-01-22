const DSSService = require('../DSSService');

class BasicPAdESProvider {
  constructor(config = {}) {
    this.config = {
      validityYears: config.validityYears || 5,
      visualSignature: config.visualSignature || false,
      includeQR: config.includeQR || false,
      ...config
    };

    this.dssService = new DSSService();
  }

  async signPDF(pdfBuffer, signatureInfo) {
    try {
      console.log('Input PDF size:', pdfBuffer.length);

      // Semnăm documentul folosind DSS
      const signedPdfBuffer = await this.dssService.signDocument(pdfBuffer, signatureInfo);
      
      // Calculăm hash-ul documentului semnat
      const documentHash = await this.calculateDocumentHash(signedPdfBuffer);
      
      return {
        signedPdf: signedPdfBuffer,
        documentHash
      };
    } catch (error) {
      console.error('Error signing PDF:', error);
      throw new Error(`Eroare la semnarea PDF-ului: ${error.message}`);
    }
  }

  async verifySignature(pdfBuffer) {
    try {
      // Validăm semnătura folosind DSS
      const validationResult = await this.dssService.validateSignature(pdfBuffer);
      
      if (!validationResult.valid) {
        throw new Error('Semnătura nu este validă');
      }

      // Extragem informațiile despre semnătură
      const { signatureInfo } = validationResult;
      
      return {
        isValid: true,
        signedBy: {
          name: signatureInfo.signer?.commonName || 'N/A',
          organization: signatureInfo.signer?.organizationName || 'N/A',
          identityNumber: signatureInfo.signer?.organizationalUnit || 'N/A'
        },
        timestamp: signatureInfo.timestamp,
        signatureLevel: signatureInfo.level,
        algorithm: signatureInfo.algorithm,
        documentHash: await this.calculateDocumentHash(pdfBuffer)
      };
    } catch (error) {
      console.error('Error verifying signature:', error);
      throw new Error(`Eroare la verificarea semnăturii: ${error.message}`);
    }
  }

  async calculateDocumentHash(pdfBuffer) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(pdfBuffer).digest('hex');
  }
}

module.exports = BasicPAdESProvider; 