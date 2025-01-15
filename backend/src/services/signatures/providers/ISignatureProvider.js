/**
 * Interfață pentru furnizorii de semnături digitale
 * Definește metodele necesare pentru semnarea și verificarea documentelor
 */
class ISignatureProvider {
  constructor() {
    if (this.constructor === ISignatureProvider) {
      throw new Error('ISignatureProvider este o interfață și nu poate fi instanțiată direct');
    }
  }

  /**
   * Inițializează furnizorul
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('Metoda initialize() trebuie implementată');
  }

  /**
   * Semnează un document PDF
   * @param {Buffer} pdfBuffer - Conținutul documentului PDF
   * @param {Object} signatureInfo - Informații despre semnătură
   * @param {Object} options - Opțiuni pentru semnare
   * @returns {Promise<Object>} Rezultatul semnării
   */
  async signPDF(pdfBuffer, signatureInfo, options = {}) {
    throw new Error('Metoda signPDF() trebuie implementată');
  }

  /**
   * Verifică semnăturile dintr-un document PDF
   * @param {Buffer} pdfBuffer - Conținutul documentului PDF
   * @returns {Promise<Array>} Lista de semnături cu statusul lor
   */
  async verifySignatures(pdfBuffer) {
    throw new Error('Metoda verifySignatures() trebuie implementată');
  }
}

module.exports = ISignatureProvider; 