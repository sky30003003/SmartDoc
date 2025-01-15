const BasicPAdESProvider = require('./providers/BasicPAdESProvider');
const fs = require('fs').promises;

class PAdESService {
  constructor(config = {}) {
    this.provider = new BasicPAdESProvider(config);
    this.initialized = false;
  }

  /**
   * Inițializează serviciul
   */
  async initialize() {
    if (!this.initialized) {
      await this.provider.initialize();
      this.initialized = true;
    }
  }

  /**
   * Semnează un document PDF
   * @param {Buffer|Object} input - Buffer-ul PDF sau parametrii pentru semnare
   * @param {Object} signatureInfo - Informații despre semnătură (dacă input e Buffer)
   * @param {Object} options - Opțiuni pentru semnare (dacă input e Buffer)
   * @returns {Promise<Object>} Rezultatul semnării
   */
  async signDocument(input, signatureInfo, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log('=== PAdESService.signDocument Debug ===');
      
      let pdfBuffer;
      
      // Verificăm dacă input este un Buffer sau un obiect cu parametri
      if (Buffer.isBuffer(input)) {
        pdfBuffer = input;
        console.log('Using provided PDF buffer, size:', pdfBuffer.length);
      } else {
        const { inputPath } = input;
        // Verificăm existența fișierului
        try {
          await fs.access(inputPath);
        } catch (error) {
          throw new Error(`Documentul nu a fost găsit la calea specificată: ${inputPath}`);
        }

        // Citim documentul PDF
        pdfBuffer = await fs.readFile(inputPath);
        console.log('PDF loaded from file, size:', pdfBuffer.length);
        
        // Folosim signatureInfo și options din obiectul input dacă nu sunt furnizate separat
        signatureInfo = input.signatureInfo || signatureInfo;
        options = input.options || options;
      }

      // Semnăm documentul
      const result = await this.provider.signPDF(pdfBuffer, signatureInfo, options);
      console.log('Document signed successfully');

      // Dacă avem outputPath în input, salvăm documentul
      if (!Buffer.isBuffer(input) && input.outputPath) {
        await fs.writeFile(input.outputPath, result.pdfBytes);
        console.log('Signed document saved to:', input.outputPath);
      }

      return result;
    } catch (error) {
      console.error('Error in PAdESService.signDocument:', error);
      throw new Error(`Eroare la semnarea documentului: ${error.message}`);
    }
  }

  /**
   * Verifică semnăturile dintr-un document PDF
   * @param {Buffer|string} input - Buffer-ul PDF sau calea către documentul PDF
   * @returns {Promise<Array>} Lista de semnături cu statusul lor
   */
  async verifySignatures(input) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log('=== PAdESService.verifySignatures Debug ===');
      
      let pdfBuffer;
      
      if (Buffer.isBuffer(input)) {
        pdfBuffer = input;
        console.log('Using provided PDF buffer, size:', pdfBuffer.length);
      } else {
        console.log('Verifying signatures for:', input);
        // Verificăm existența fișierului
        try {
          await fs.access(input);
        } catch (error) {
          throw new Error(`Documentul nu a fost găsit la calea specificată: ${input}`);
        }

        // Citim documentul PDF
        pdfBuffer = await fs.readFile(input);
        console.log('PDF loaded from file, size:', pdfBuffer.length);
      }

      // Verificăm semnăturile
      const results = await this.provider.verifySignatures(pdfBuffer);
      console.log('Verification results:', JSON.stringify(results, null, 2));

      return results;
    } catch (error) {
      console.error('Error in PAdESService.verifySignatures:', error);
      throw new Error(`Eroare la verificarea semnăturilor: ${error.message}`);
    }
  }
}

module.exports = PAdESService; 