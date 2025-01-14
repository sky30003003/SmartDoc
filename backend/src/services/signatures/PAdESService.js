const BasicPAdESProvider = require('./providers/BasicPAdESProvider');
const SignatureInfo = require('./models/SignatureInfo');

/**
 * Serviciu principal pentru semnături PAdES
 * Coordonează toate componentele și oferă o interfață unificată pentru semnături
 */
class PAdESService {
  constructor() {
    this.provider = null;
    this.config = null;
  }

  /**
   * Inițializează serviciul cu un furnizor și configurație
   * @param {Object} config - Configurația serviciului
   */
  async initialize(config = {}) {
    try {
      // Inițializăm furnizorul de bază pentru PAdES
      this.provider = new BasicPAdESProvider();
      await this.provider.initialize(config);
      
      this.config = {
        basePath: config.basePath || './certificates',
        validityYears: config.validityYears || 5,
        visualSignature: config.visualSignature !== false,
        includeQR: config.includeQR !== false,
        ...config
      };

      return true;
    } catch (error) {
      throw new Error(`Eroare la inițializarea serviciului PAdES: ${error.message}`);
    }
  }

  /**
   * Generează chei și certificat pentru un semnatar
   * @param {Object} signerInfo - Informații despre semnatar
   * @returns {Promise<Object>} Cheile și certificatul generate
   */
  async generateSignerCredentials(signerInfo) {
    try {
      // Generăm perechea de chei
      const keyPair = await this.provider.generateKeyPair();

      // Generăm certificatul
      const certificate = await this.provider.generateCertificate(keyPair, signerInfo, {
        validityYears: this.config.validityYears
      });

      return {
        keyPair,
        certificate
      };
    } catch (error) {
      throw new Error(`Eroare la generarea credențialelor: ${error.message}`);
    }
  }

  /**
   * Semnează un document PDF
   * @param {Buffer} pdfBuffer - Conținutul documentului PDF
   * @param {Object} signerInfo - Informații despre semnatar
   * @param {Object} options - Opțiuni pentru semnare
   * @returns {Promise<Object>} Documentul semnat și informații despre semnătură
   */
  async signDocument(pdfBuffer, signerInfo, options = {}) {
    try {
      // Creăm informațiile despre semnătură
      const signatureInfo = new SignatureInfo({
        signerId: signerInfo.id,
        signerName: `${signerInfo.firstName} ${signerInfo.lastName}`,
        signerEmail: signerInfo.email,
        organization: signerInfo.organization
      });

      // Configurăm opțiunile de semnare
      const signOptions = {
        visualSignature: this.config.visualSignature,
        includeQR: this.config.includeQR,
        title: options.title,
        ...options
      };

      // Semnăm documentul
      const signedPdfBuffer = await this.provider.signPDF(pdfBuffer, signatureInfo, signOptions);

      // Extragem informațiile despre semnătură
      const signatures = await this.provider.extractSignatureInfo(signedPdfBuffer);
      const lastSignature = signatures[signatures.length - 1];

      return {
        document: signedPdfBuffer,
        signature: lastSignature
      };
    } catch (error) {
      throw new Error(`Eroare la semnarea documentului: ${error.message}`);
    }
  }

  /**
   * Verifică semnăturile unui document
   * @param {Buffer} pdfBuffer - Conținutul documentului PDF
   * @returns {Promise<Array>} Lista de semnături cu statusul lor
   */
  async verifyDocument(pdfBuffer) {
    try {
      return await this.provider.verifySignatures(pdfBuffer);
    } catch (error) {
      throw new Error(`Eroare la verificarea documentului: ${error.message}`);
    }
  }

  /**
   * Adaugă o marcă temporală la o semnătură existentă
   * @param {Buffer} pdfBuffer - Conținutul documentului PDF
   * @param {string} signatureId - Identificatorul semnăturii
   * @returns {Promise<Buffer>} Documentul cu marca temporală adăugată
   */
  async addTimestamp(pdfBuffer, signatureId) {
    try {
      return await this.provider.addTimestamp(pdfBuffer, signatureId);
    } catch (error) {
      throw new Error(`Eroare la adăugarea mărcii temporale: ${error.message}`);
    }
  }

  /**
   * Verifică validitatea unui certificat
   * @param {string} certificatePem - Certificatul în format PEM
   * @returns {Promise<Object>} Informații despre validitatea certificatului
   */
  async verifyCertificate(certificatePem) {
    try {
      return await this.provider.verifyCertificate(certificatePem);
    } catch (error) {
      throw new Error(`Eroare la verificarea certificatului: ${error.message}`);
    }
  }

  /**
   * Extrage informații despre semnături dintr-un document
   * @param {Buffer} pdfBuffer - Conținutul documentului PDF
   * @returns {Promise<Array>} Lista de informații despre semnături
   */
  async getSignatureInfo(pdfBuffer) {
    try {
      return await this.provider.extractSignatureInfo(pdfBuffer);
    } catch (error) {
      throw new Error(`Eroare la extragerea informațiilor despre semnături: ${error.message}`);
    }
  }

  /**
   * Verifică dacă serviciul este inițializat
   * @returns {boolean} True dacă serviciul este inițializat
   */
  isInitialized() {
    return this.provider !== null && this.config !== null;
  }

  /**
   * Obține configurația curentă
   * @returns {Object} Configurația serviciului
   */
  getConfig() {
    return { ...this.config };
  }
}

// Exportăm o singură instanță a serviciului (Singleton)
module.exports = new PAdESService(); 