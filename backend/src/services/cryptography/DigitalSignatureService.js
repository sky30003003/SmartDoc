const forge = require('node-forge');
const crypto = require('crypto');

class DigitalSignatureService {
  /**
   * Calculează datele de valabilitate pentru un certificat
   * @param {Object} orgSettings - Setările organizației pentru perioada de valabilitate
   * @returns {Object} Obiect cu datele notBefore și notAfter
   */
  static _calculateValidity(orgSettings = null) {
    const notBefore = new Date();
    const notAfter = new Date();

    // Folosim setările organizației dacă există, altfel valoarea implicită de 5 ani
    const validityYears = orgSettings?.certificateSettings?.validityYears || 5;
    notAfter.setFullYear(notBefore.getFullYear() + validityYears);

    return { notBefore, notAfter };
  }

  /**
   * Generează o pereche de chei RSA pentru un angajat
   * @returns {Object} Obiect conținând cheile publică și privată în format PEM
   */
  static generateKeyPair() {
    return new Promise((resolve, reject) => {
      forge.pki.rsa.generateKeyPair({ bits: 2048 }, (err, keypair) => {
        if (err) {
          reject(new Error(`Eroare la generarea perechii de chei: ${err.message}`));
        } else {
          resolve({
            publicKey: forge.pki.publicKeyToPem(keypair.publicKey),
            privateKey: forge.pki.privateKeyToPem(keypair.privateKey)
          });
        }
      });
    });
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
   * @param {Object} orgSettings - Setările organizației
   * @returns {string} Certificatul în format PEM
   */
  static generateCertificate(keypair, employeeInfo, orgSettings = null) {
    const cert = forge.pki.createCertificate();
    cert.publicKey = forge.pki.publicKeyFromPem(keypair.publicKey);
    cert.serialNumber = '01';

    // Setăm perioada de valabilitate folosind setările organizației
    const validity = this._calculateValidity(orgSettings);
    cert.validity.notBefore = validity.notBefore;
    cert.validity.notAfter = validity.notAfter;

    const validityYears = orgSettings?.certificateSettings?.validityYears || 5;

    const attrs = [{
      name: 'commonName',
      value: `${employeeInfo.firstName} ${employeeInfo.lastName}`
    }, {
      name: 'countryName',
      value: 'RO'
    }, {
      shortName: 'OU',
      value: employeeInfo.organization
    }, {
      name: 'validityPeriod',
      value: `${validityYears} years`
    }];

    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    
    cert.sign(forge.pki.privateKeyFromPem(keypair.privateKey));
    
    return forge.pki.certificateToPem(cert);
  }

  /**
   * Verifică valabilitatea unui certificat
   * @param {string} certificatePem - Certificatul în format PEM
   * @returns {Object} Obiect cu informații despre valabilitate
   */
  static verifyCertificateValidity(certificatePem) {
    try {
      const cert = forge.pki.certificateFromPem(certificatePem);
      const now = new Date();

      const validityPeriod = cert.subject.getField('validityPeriod')?.value;

      return {
        isValid: now >= cert.validity.notBefore && now <= cert.validity.notAfter,
        notBefore: cert.validity.notBefore,
        notAfter: cert.validity.notAfter,
        validityPeriod: validityPeriod,
        daysUntilExpiration: Math.ceil((cert.validity.notAfter - now) / (1000 * 60 * 60 * 24)),
        yearsUntilExpiration: Math.ceil((cert.validity.notAfter - now) / (1000 * 60 * 60 * 24 * 365))
      };
    } catch (error) {
      console.error('Error verifying certificate validity:', error);
      return {
        isValid: false,
        error: error.message
      };
    }
  }
}

module.exports = DigitalSignatureService; 