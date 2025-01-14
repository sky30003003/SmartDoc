const ISignatureProvider = require('../interfaces/ISignatureProvider');
const PDFManipulator = require('../utils/PDFManipulator');
const CertificateManager = require('../utils/CertificateManager');
const TimestampService = require('../utils/TimestampService');
const SignatureInfo = require('../models/SignatureInfo');
const SignatureMetadata = require('../models/SignatureMetadata');
const crypto = require('crypto');

/**
 * Implementare de bază pentru PAdES
 * Oferă funcționalități de semnare și verificare conform standardului PAdES-Basic
 */
class BasicPAdESProvider extends ISignatureProvider {
  constructor() {
    super();
    this.initialized = false;
    this.config = null;
  }

  /**
   * Inițializează furnizorul cu configurația necesară
   * @param {Object} config - Configurația furnizorului
   */
  async initialize(config) {
    this.config = {
      basePath: config.basePath || './certificates',
      validityYears: config.validityYears || 5,
      ...config
    };
    this.initialized = true;
  }

  /**
   * Generează o pereche de chei pentru semnături digitale
   * @returns {Promise<Object>} Obiect conținând cheile publică și privată
   */
  async generateKeyPair() {
    if (!this.initialized) {
      throw new Error('Furnizorul nu a fost inițializat');
    }

    return await CertificateManager.generateKeyPair();
  }

  /**
   * Generează un certificat digital pentru o cheie publică
   * @param {Object} keyPair - Perechea de chei
   * @param {Object} subjectInfo - Informații despre subiectul certificatului
   * @param {Object} options - Opțiuni pentru generarea certificatului
   * @returns {Promise<string>} Certificatul în format PEM
   */
  async generateCertificate(keyPair, subjectInfo, options = {}) {
    if (!this.initialized) {
      throw new Error('Furnizorul nu a fost inițializat');
    }

    const certificateOptions = {
      validityYears: this.config.validityYears,
      ...options
    };

    return await CertificateManager.generateCertificate(keyPair, subjectInfo, certificateOptions);
  }

  /**
   * Semnează un document PDF folosind PAdES
   * @param {Buffer} pdfBuffer - Conținutul documentului PDF
   * @param {Object} signatureInfo - Informații despre semnătură
   * @param {Object} options - Opțiuni pentru semnare
   * @returns {Promise<Buffer>} Documentul PDF semnat
   */
  async signPDF(pdfBuffer, signatureInfo, options = {}) {
    if (!this.initialized) {
      throw new Error('Furnizorul nu a fost inițializat');
    }

    try {
      // Încărcăm documentul PDF
      const pdfDoc = await PDFManipulator.loadPDF(pdfBuffer);

      // Calculăm hash-ul documentului original
      const documentHash = crypto
        .createHash('sha256')
        .update(pdfBuffer)
        .digest('hex');

      // Creăm informațiile despre semnătură
      const signature = new SignatureInfo({
        ...signatureInfo,
        documentHash
      });

      // Validăm informațiile semnăturii
      signature.validate();

      // Adăugăm semnătura vizuală dacă este cerută
      if (options.visualSignature) {
        const visualPosition = await PDFManipulator.addVisualSignature(pdfDoc, signature, options);
        signature.setVisualPosition(visualPosition);
      }

      // Generăm marca temporală
      const timestamp = await TimestampService.generateTimestamp(documentHash);

      // Creăm metadatele semnăturii
      const metadata = new SignatureMetadata({
        signatureType: 'PAdES-Basic',
        signatureFormat: 'CAdES',
        signatureLevel: 'B-B',
        certificateInfo: {
          subject: signatureInfo.signerName,
          issuer: signatureInfo.organization,
          validFrom: new Date(),
          validTo: new Date(Date.now() + this.config.validityYears * 365 * 24 * 60 * 60 * 1000)
        },
        timestamps: [timestamp]
      });

      // Adăugăm metadatele în PDF
      await PDFManipulator.addMetadata(pdfDoc, {
        title: options.title || 'Document semnat digital',
        author: signatureInfo.signerName,
        subject: 'Document semnat cu PAdES-Basic',
        keywords: 'semnătură digitală, PAdES, SmartDoc',
        signatures: [{
          info: signature.toJSON(),
          metadata: metadata.toJSON()
        }]
      });

      // Salvăm documentul modificat
      return await PDFManipulator.savePDF(pdfDoc);
    } catch (error) {
      throw new Error(`Eroare la semnarea documentului: ${error.message}`);
    }
  }

  /**
   * Verifică semnăturile dintr-un document PDF
   * @param {Buffer} pdfBuffer - Conținutul documentului PDF
   * @returns {Promise<Array>} Lista de semnături cu statusul lor
   */
  async verifySignatures(pdfBuffer) {
    if (!this.initialized) {
      throw new Error('Furnizorul nu a fost inițializat');
    }

    try {
      // Încărcăm documentul PDF
      const pdfDoc = await PDFManipulator.loadPDF(pdfBuffer);

      // Extragem metadatele
      const metadata = await PDFManipulator.extractMetadata(pdfDoc);

      // Verificăm fiecare semnătură
      const verificationResults = await Promise.all(
        (metadata.signatures || []).map(async (signature) => {
          try {
            // Verificăm hash-ul documentului
            const currentHash = crypto
              .createHash('sha256')
              .update(pdfBuffer)
              .digest('hex');

            const isHashValid = currentHash === signature.info.documentHash;

            // Verificăm marca temporală
            const timestampVerification = await TimestampService.verifyTimestamp(
              signature.metadata.timestamps[0],
              signature.info.documentHash
            );

            return {
              signatureId: signature.info.signatureId,
              signerInfo: {
                name: signature.info.signerName,
                email: signature.info.signerEmail,
                organization: signature.info.organization
              },
              isValid: isHashValid && timestampVerification.isValid,
              documentHash: signature.info.documentHash,
              currentHash,
              timestamp: timestampVerification.isValid ? signature.metadata.timestamps[0] : null,
              errors: [
                ...(isHashValid ? [] : ['Documentul a fost modificat după semnare']),
                ...(timestampVerification.isValid ? [] : ['Marca temporală nu este validă'])
              ]
            };
          } catch (error) {
            return {
              signatureId: signature.info.signatureId,
              signerInfo: {
                name: signature.info.signerName,
                email: signature.info.signerEmail,
                organization: signature.info.organization
              },
              isValid: false,
              errors: [`Eroare la verificarea semnăturii: ${error.message}`]
            };
          }
        })
      );

      return verificationResults;
    } catch (error) {
      throw new Error(`Eroare la verificarea semnăturilor: ${error.message}`);
    }
  }

  /**
   * Adaugă o marcă temporală la o semnătură
   * @param {Buffer} pdfBuffer - Conținutul documentului PDF
   * @param {string} signatureId - Identificatorul semnăturii
   * @returns {Promise<Buffer>} Documentul PDF cu marca temporală adăugată
   */
  async addTimestamp(pdfBuffer, signatureId) {
    if (!this.initialized) {
      throw new Error('Furnizorul nu a fost inițializat');
    }

    try {
      // Încărcăm documentul PDF
      const pdfDoc = await PDFManipulator.loadPDF(pdfBuffer);

      // Extragem metadatele
      const metadata = await PDFManipulator.extractMetadata(pdfDoc);

      // Găsim semnătura
      const signatureIndex = metadata.signatures.findIndex(s => s.info.signatureId === signatureId);
      if (signatureIndex === -1) {
        throw new Error('Semnătura nu a fost găsită');
      }

      // Generăm o nouă marcă temporală
      const timestamp = await TimestampService.generateTimestamp(
        metadata.signatures[signatureIndex].info.documentHash
      );

      // Adăugăm marca temporală la semnătură
      metadata.signatures[signatureIndex].metadata.timestamps.push(timestamp);

      // Actualizăm metadatele în PDF
      await PDFManipulator.addMetadata(pdfDoc, metadata);

      // Salvăm documentul modificat
      return await PDFManipulator.savePDF(pdfDoc);
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
    if (!this.initialized) {
      throw new Error('Furnizorul nu a fost inițializat');
    }

    return await CertificateManager.verifyCertificate(certificatePem);
  }

  /**
   * Extrage informații despre semnături dintr-un document PDF
   * @param {Buffer} pdfBuffer - Conținutul documentului PDF
   * @returns {Promise<Array>} Lista de informații despre semnături
   */
  async extractSignatureInfo(pdfBuffer) {
    if (!this.initialized) {
      throw new Error('Furnizorul nu a fost inițializat');
    }

    try {
      // Încărcăm documentul PDF
      const pdfDoc = await PDFManipulator.loadPDF(pdfBuffer);

      // Extragem metadatele
      const metadata = await PDFManipulator.extractMetadata(pdfDoc);

      // Returnăm informațiile despre semnături
      return (metadata.signatures || []).map(signature => ({
        info: SignatureInfo.fromJSON(signature.info),
        metadata: SignatureMetadata.fromJSON(signature.metadata)
      }));
    } catch (error) {
      throw new Error(`Eroare la extragerea informațiilor despre semnături: ${error.message}`);
    }
  }
}

module.exports = BasicPAdESProvider; 