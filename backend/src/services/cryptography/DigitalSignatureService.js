const forge = require('node-forge');
const crypto = require('crypto');

class DigitalSignatureService {
  /**
   * Generează o pereche de chei RSA pentru un angajat
   * @returns {Object} Obiect conținând cheile publică și privată în format PEM
   */
  static generateKeyPair() {
    const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
    
    return {
      publicKey: forge.pki.publicKeyToPem(keypair.publicKey),
      privateKey: forge.pki.privateKeyToPem(keypair.privateKey)
    };
  }

  /**
   * Calculează hash-ul SHA-256 al unui document
   * @param {Buffer} documentBuffer - Conținutul documentului
   * @returns {string} Hash-ul documentului în format hex
   */
  static calculateDocumentHash(documentBuffer) {
    return crypto
      .createHash('sha256')
      .update(documentBuffer)
      .digest('hex');
  }

  /**
   * Semnează hash-ul unui document folosind cheia privată
   * @param {string} documentHash - Hash-ul documentului
   * @param {string} privateKeyPem - Cheia privată în format PEM
   * @returns {string} Semnătura digitală în format base64
   */
  static signDocument(documentHash, privateKeyPem) {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const md = forge.md.sha256.create();
    md.update(documentHash, 'utf8');
    
    const signature = privateKey.sign(md);
    return forge.util.encode64(signature);
  }

  /**
   * Verifică o semnătură digitală
   * @param {string} documentHash - Hash-ul documentului
   * @param {string} signature - Semnătura digitală în format base64
   * @param {string} publicKeyPem - Cheia publică în format PEM
   * @returns {boolean} True dacă semnătura este validă
   */
  static verifySignature(documentHash, signature, publicKeyPem) {
    try {
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
      const md = forge.md.sha256.create();
      md.update(documentHash, 'utf8');
      
      const decodedSignature = forge.util.decode64(signature);
      return publicKey.verify(md.digest().bytes(), decodedSignature);
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Generează un certificat pentru cheia publică
   * @param {Object} keypair - Perechea de chei
   * @param {Object} employeeInfo - Informații despre angajat
   * @returns {string} Certificatul în format PEM
   */
  static generateCertificate(keypair, employeeInfo) {
    const cert = forge.pki.createCertificate();
    cert.publicKey = forge.pki.publicKeyFromPem(keypair.publicKey);
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

    const attrs = [{
      name: 'commonName',
      value: `${employeeInfo.firstName} ${employeeInfo.lastName}`
    }, {
      name: 'countryName',
      value: 'RO'
    }, {
      shortName: 'OU',
      value: employeeInfo.organization
    }];

    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    
    // Auto-semnare (pentru semnătură avansată, nu calificată)
    cert.sign(forge.pki.privateKeyFromPem(keypair.privateKey));
    
    return forge.pki.certificateToPem(cert);
  }
}

module.exports = DigitalSignatureService; 