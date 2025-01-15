const { PDFDocument, PDFName, PDFString } = require('pdf-lib');
const crypto = require('crypto');
const PDFManipulator = require('../utils/PDFManipulator');

// Opțiuni consistente pentru încărcarea și salvarea PDF-urilor
const PDF_LOAD_OPTIONS = {
  updateMetadata: false,
  ignoreEncryption: true
};

const PDF_SAVE_OPTIONS = {
  useObjectStreams: false,
  addDefaultPage: false,
  updateMetadata: false
};

/**
 * Implementare de bază pentru PAdES
 * Oferă funcționalități de semnare și verificare conform standardului PAdES-Basic
 */
class BasicPAdESProvider {
  constructor(config = {}) {
    this.config = {
      validityYears: 5,
      ...config
    };
    this.initialized = false;
    this.manipulator = new PDFManipulator();
  }

  /**
   * Inițializează furnizorul
   */
  async initialize() {
    this.initialized = true;
  }

  /**
   * Calculează hash-ul unui document PDF
   * @param {PDFDocument|Buffer} source - Documentul PDF sau buffer-ul său
   * @returns {Promise<string>} Hash-ul documentului
   */
  async calculateDocumentHash(source) {
    try {
      let pdfDoc;
      
      // Încărcăm PDF-ul pentru a normaliza conținutul
      if (Buffer.isBuffer(source)) {
        pdfDoc = await PDFDocument.load(source, PDF_LOAD_OPTIONS);
      } else if (source instanceof PDFDocument) {
        pdfDoc = await PDFDocument.load(await source.save(PDF_SAVE_OPTIONS), PDF_LOAD_OPTIONS);
      } else {
        throw new Error('Sursa invalidă pentru calcularea hash-ului');
      }

      // Ștergem toate metadatele pentru hash
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setCreator('');
      pdfDoc.setProducer('');
      
      if (pdfDoc.catalog.has(PDFName.of('Info'))) {
        pdfDoc.catalog.delete(PDFName.of('Info'));
      }
      
      if (pdfDoc.catalog.has(PDFName.of('Metadata'))) {
        pdfDoc.catalog.delete(PDFName.of('Metadata'));
      }

      const pdfBytes = await pdfDoc.save(PDF_SAVE_OPTIONS);

      return crypto
        .createHash('sha256')
        .update(pdfBytes)
        .digest('hex');
    } catch (error) {
      console.error('Error calculating document hash:', error);
      throw new Error(`Eroare la calcularea hash-ului: ${error.message}`);
    }
  }

  /**
   * Semnează un document PDF folosind PAdES
   * @param {Buffer} pdfBuffer - Conținutul documentului PDF
   * @param {Object} signatureInfo - Informații despre semnătură
   * @param {Object} options - Opțiuni pentru semnare
   * @returns {Promise<Object>} Rezultatul semnării
   */
  async signPDF(pdfBuffer, signatureInfo, options = {}) {
    if (!this.initialized) {
      throw new Error('Furnizorul nu a fost inițializat');
    }

    try {
      console.log('=== Signing PDF Debug ===');
      console.log('Input PDF size:', pdfBuffer.length);

      // Încărcăm PDF-ul și calculăm hash-ul original
      const pdfDoc = await PDFDocument.load(pdfBuffer, PDF_LOAD_OPTIONS);
      const documentHash = await this.calculateDocumentHash(pdfBuffer);
      console.log('Original document hash:', documentHash);

      // Adăugăm metadata
      const metadata = {
        title: signatureInfo.title || '',
        author: signatureInfo.signerName || '',
        subject: 'Document semnat cu PAdES-Basic',
        keywords: ['semnătură digitală', 'PAdES', 'SmartDoc'],
        creator: 'SmartDoc PAdES Signer',
        producer: 'SmartDoc',
        signatures: [{
          info: {
            signatureId: signatureInfo.signatureId,
            signerName: signatureInfo.signerName,
            signerEmail: signatureInfo.signerEmail,
            organization: signatureInfo.organization,
            documentHash: documentHash,
            timestamp: new Date().toISOString()
          },
          metadata: {
            signatureType: signatureInfo.signatureType || 'PAdES-Basic',
            timestamps: []
          }
        }]
      };

      // Setăm metadata în document
      await this.manipulator.addMetadata(pdfDoc, metadata);
      
      // Salvăm documentul final cu opțiuni de salvare pentru metadata
      const pdfBytes = await pdfDoc.save({ ...PDF_SAVE_OPTIONS, updateMetadata: true });
      const signedBuffer = Buffer.from(pdfBytes);

      // Verificăm starea finală
      const verifyDoc = await PDFDocument.load(signedBuffer, PDF_LOAD_OPTIONS);
      const savedMetadata = await this.manipulator.extractMetadata(verifyDoc);
      const finalHash = await this.calculateDocumentHash(signedBuffer);
      
      console.log('Final document state:', {
        originalHash: documentHash,
        finalHash,
        match: documentHash === finalHash,
        size: signedBuffer.length,
        hasSignatures: !!savedMetadata.signatures,
        storedHash: savedMetadata.signatures?.[0]?.info?.documentHash
      });

      return {
        pdfBytes: signedBuffer,
        documentHash,
        metadata: savedMetadata
      };

    } catch (error) {
      console.error('Error signing PDF:', error);
      throw new Error(`Eroare la semnarea PDF-ului: ${error.message}`);
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
      const pdfDoc = await PDFDocument.load(pdfBuffer, PDF_LOAD_OPTIONS);
      
      // Extragem metadatele
      const metadata = await this.manipulator.extractMetadata(pdfDoc);

      // Calculăm hash-ul curent al documentului
      const currentHash = await this.calculateDocumentHash(pdfBuffer);

      console.log('Verificare semnături:', {
        totalSignatures: metadata.signatures?.length || 0,
        currentHash,
        metadata: JSON.stringify(metadata, null, 2)
      });

      // Verificăm fiecare semnătură
      const verificationResults = await Promise.all(
        (metadata.signatures || []).map(async (signature) => {
          const { info } = signature;
          
          console.log('Verificare semnătură:', {
            id: info.signatureId,
            storedHash: info.documentHash,
            currentHash,
            timestamp: info.timestamp
          });

          // Verificăm hash-ul documentului
          const isHashValid = info.documentHash === currentHash;

          // Convertim timestamp-ul în Date dacă este string
          let timestamp = null;
          if (info.timestamp) {
            timestamp = typeof info.timestamp === 'string' 
              ? new Date(info.timestamp)
              : info.timestamp;
          }

          // Verificăm validitatea timestamp-ului
          const isTimestampValid = timestamp instanceof Date && !isNaN(timestamp);

          return {
            signatureId: info.signatureId,
            signerInfo: {
              name: info.signerName,
              email: info.signerEmail,
              organization: info.organization
            },
            isValid: isHashValid && isTimestampValid,
            documentHash: info.documentHash,
            currentHash: currentHash,
            timestamp: isTimestampValid ? timestamp.toISOString() : null,
            errors: [
              ...(!isHashValid ? ['Documentul a fost modificat după semnare'] : []),
              ...(!isTimestampValid ? ['Marca temporală nu este validă'] : [])
            ]
          };
        })
      );

      return verificationResults;
    } catch (error) {
      console.error('Error verifying signatures:', error);
      throw new Error(`Eroare la verificarea semnăturilor: ${error.message}`);
    }
  }
}

module.exports = BasicPAdESProvider; 