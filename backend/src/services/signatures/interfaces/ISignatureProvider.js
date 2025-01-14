/**
 * Interfață pentru furnizori de semnături digitale
 * Definește contractul pe care trebuie să-l implementeze toți furnizorii de semnături
 */
class ISignatureProvider {
  /**
   * Inițializează furnizorul de semnături cu setările necesare
   * @param {Object} config - Configurația furnizorului
   */
  async initialize(config) {
    throw new Error('Method not implemented');
  }

  /**
   * Generează o pereche de chei pentru semnături digitale
   * @returns {Promise<Object>} Obiect conținând cheile publică și privată
   */
  async generateKeyPair() {
    throw new Error('Method not implemented');
  }

  /**
   * Generează un certificat digital pentru o cheie publică
   * @param {Object} keyPair - Perechea de chei
   * @param {Object} subjectInfo - Informații despre subiectul certificatului
   * @param {Object} options - Opțiuni pentru generarea certificatului
   * @returns {Promise<string>} Certificatul în format PEM
   */
  async generateCertificate(keyPair, subjectInfo, options) {
    throw new Error('Method not implemented');
  }

  /**
   * Semnează un document PDF folosind PAdES
   * @param {Buffer} pdfBuffer - Conținutul documentului PDF
   * @param {Object} signatureInfo - Informații despre semnătură (cheie privată, certificat etc.)
   * @param {Object} options - Opțiuni pentru semnare (poziție vizuală, timestamp etc.)
   * @returns {Promise<Buffer>} Documentul PDF semnat
   */
  async signPDF(pdfBuffer, signatureInfo, options) {
    throw new Error('Method not implemented');
  }

  /**
   * Verifică semnăturile dintr-un document PDF
   * @param {Buffer} pdfBuffer - Conținutul documentului PDF
   * @returns {Promise<Array>} Lista de semnături cu statusul lor
   */
  async verifySignatures(pdfBuffer) {
    throw new Error('Method not implemented');
  }

  /**
   * Adaugă o marcă temporală la o semnătură
   * @param {Buffer} pdfBuffer - Conținutul documentului PDF
   * @param {string} signatureId - Identificatorul semnăturii
   * @returns {Promise<Buffer>} Documentul PDF cu marca temporală adăugată
   */
  async addTimestamp(pdfBuffer, signatureId) {
    throw new Error('Method not implemented');
  }

  /**
   * Verifică validitatea unui certificat
   * @param {string} certificatePem - Certificatul în format PEM
   * @returns {Promise<Object>} Informații despre validitatea certificatului
   */
  async verifyCertificate(certificatePem) {
    throw new Error('Method not implemented');
  }

  /**
   * Extrage informații despre semnături dintr-un document PDF
   * @param {Buffer} pdfBuffer - Conținutul documentului PDF
   * @returns {Promise<Array>} Lista de informații despre semnături
   */
  async extractSignatureInfo(pdfBuffer) {
    throw new Error('Method not implemented');
  }
}

module.exports = ISignatureProvider;