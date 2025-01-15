const forge = require('node-forge');
const fs = require('fs').promises;
const path = require('path');

/**
 * Manager pentru certificate digitale
 * Gestionează generarea, stocarea și validarea certificatelor
 */
class CertificateManager {
  /**
   * Generează o pereche de chei RSA
   * @param {Object} options - Opțiuni pentru generarea cheilor
   * @returns {Promise<Object>} Perechea de chei în format PEM
   */
  static async generateKeyPair(options = { bits: 2048 }) {
    try {
      return new Promise((resolve, reject) => {
        forge.pki.rsa.generateKeyPair(options, (err, keypair) => {
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
    } catch (error) {
      throw new Error(`Eroare la generarea perechii de chei: ${error.message}`);
    }
  }

  /**
   * Generează un certificat digital
   * @param {Object} keyPair - Perechea de chei
   * @param {Object} subjectInfo - Informații despre subiect
   * @param {Object} options - Opțiuni pentru certificat
   * @returns {Promise<string>} Certificatul în format PEM
   */
  static async generateCertificate(keyPair, subjectInfo, options = {}) {
    try {
      const cert = forge.pki.createCertificate();
      
      // Setăm cheia publică
      cert.publicKey = forge.pki.publicKeyFromPem(keyPair.publicKey);
      
      // Generăm un număr de serie unic
      cert.serialNumber = Date.now().toString();

      // Setăm perioada de valabilitate
      const { validityYears = 5 } = options;
      const now = new Date();
      cert.validity.notBefore = now;
      const notAfter = new Date();
      notAfter.setFullYear(now.getFullYear() + validityYears);
      cert.validity.notAfter = notAfter;

      // Construim atributele subiectului
      const attrs = [{
        name: 'commonName',
        value: `${subjectInfo.firstName} ${subjectInfo.lastName}`
      }, {
        name: 'countryName',
        value: 'RO'
      }, {
        shortName: 'O',
        value: subjectInfo.organization
      }, {
        shortName: 'OU',
        value: 'Digital Signatures'
      }, {
        name: 'emailAddress',
        value: subjectInfo.email
      }];

      // Adăugăm extensii
      const extensions = [{
        name: 'basicConstraints',
        cA: false
      }, {
        name: 'keyUsage',
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true
      }, {
        name: 'extKeyUsage',
        serverAuth: true,
        clientAuth: true,
        codeSigning: true,
        emailProtection: true,
        timeStamping: true
      }, {
        name: 'subjectAltName',
        altNames: [{
          type: 6, // URI
          value: `http://smartdoc.com/certificates/${subjectInfo.id}`
        }, {
          type: 1, // email
          value: subjectInfo.email
        }]
      }];

      cert.setSubject(attrs);
      cert.setIssuer(attrs); // Self-signed pentru PAdES-Basic
      cert.setExtensions(extensions);

      // Semnăm certificatul
      cert.sign(forge.pki.privateKeyFromPem(keyPair.privateKey), forge.md.sha256.create());

      return forge.pki.certificateToPem(cert);
    } catch (error) {
      throw new Error(`Eroare la generarea certificatului: ${error.message}`);
    }
  }

  /**
   * Verifică validitatea unui certificat
   * @param {string} certificatePem - Certificatul în format PEM
   * @returns {Promise<Object>} Informații despre validitatea certificatului
   */
  static async verifyCertificate(certificatePem) {
    try {
      const cert = forge.pki.certificateFromPem(certificatePem);
      const now = new Date();

      // Verificăm perioada de valabilitate
      const isValid = now >= cert.validity.notBefore && now <= cert.validity.notAfter;

      // Extragem informații despre subiect
      const subject = {};
      cert.subject.attributes.forEach(attr => {
        subject[attr.name] = attr.value;
      });

      // Calculăm perioada rămasă
      const daysUntilExpiration = Math.ceil((cert.validity.notAfter - now) / (1000 * 60 * 60 * 24));
      const yearsUntilExpiration = Math.ceil(daysUntilExpiration / 365);

      return {
        isValid,
        subject,
        notBefore: cert.validity.notBefore,
        notAfter: cert.validity.notAfter,
        serialNumber: cert.serialNumber,
        daysUntilExpiration,
        yearsUntilExpiration,
        extensions: cert.extensions
      };
    } catch (error) {
      throw new Error(`Eroare la verificarea certificatului: ${error.message}`);
    }
  }

  /**
   * Salvează un certificat și cheile asociate
   * @param {string} basePath - Calea de bază pentru stocare
   * @param {Object} keyPair - Perechea de chei
   * @param {string} certificate - Certificatul în format PEM
   * @param {string} id - Identificatorul unic
   * @returns {Promise<Object>} Căile către fișierele salvate
   */
  static async saveCertificateAndKeys(basePath, keyPair, certificate, id) {
    try {
      const certPath = path.join(basePath, `${id}_cert.pem`);
      const publicKeyPath = path.join(basePath, `${id}_public.pem`);
      const privateKeyPath = path.join(basePath, `${id}_private.pem`);

      await fs.mkdir(basePath, { recursive: true });
      
      await Promise.all([
        fs.writeFile(certPath, certificate),
        fs.writeFile(publicKeyPath, keyPair.publicKey),
        fs.writeFile(privateKeyPath, keyPair.privateKey)
      ]);

      return {
        certificatePath: certPath,
        publicKeyPath: publicKeyPath,
        privateKeyPath: privateKeyPath
      };
    } catch (error) {
      throw new Error(`Eroare la salvarea certificatului și cheilor: ${error.message}`);
    }
  }

  /**
   * Încarcă un certificat și cheile asociate
   * @param {string} basePath - Calea de bază pentru stocare
   * @param {string} id - Identificatorul unic
   * @returns {Promise<Object>} Certificatul și cheile în format PEM
   */
  static async loadCertificateAndKeys(basePath, id) {
    try {
      const certPath = path.join(basePath, `${id}_cert.pem`);
      const publicKeyPath = path.join(basePath, `${id}_public.pem`);
      const privateKeyPath = path.join(basePath, `${id}_private.pem`);

      const [certificate, publicKey, privateKey] = await Promise.all([
        fs.readFile(certPath, 'utf8'),
        fs.readFile(publicKeyPath, 'utf8'),
        fs.readFile(privateKeyPath, 'utf8')
      ]);

      return {
        certificate,
        keyPair: {
          publicKey,
          privateKey
        }
      };
    } catch (error) {
      throw new Error(`Eroare la încărcarea certificatului și cheilor: ${error.message}`);
    }
  }

  /**
   * Șterge un certificat și cheile asociate
   * @param {string} basePath - Calea de bază pentru stocare
   * @param {string} id - Identificatorul unic
   * @returns {Promise<void>}
   */
  static async deleteCertificateAndKeys(basePath, id) {
    try {
      const certPath = path.join(basePath, `${id}_cert.pem`);
      const publicKeyPath = path.join(basePath, `${id}_public.pem`);
      const privateKeyPath = path.join(basePath, `${id}_private.pem`);

      await Promise.all([
        fs.unlink(certPath).catch(() => {}),
        fs.unlink(publicKeyPath).catch(() => {}),
        fs.unlink(privateKeyPath).catch(() => {})
      ]);
    } catch (error) {
      throw new Error(`Eroare la ștergerea certificatului și cheilor: ${error.message}`);
    }
  }
}

module.exports = CertificateManager; 