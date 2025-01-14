/**
 * Model pentru informațiile despre o semnătură digitală
 * Conține detalii despre semnatar, timestamp, și poziția vizuală a semnăturii
 */
class SignatureInfo {
  constructor({
    signerId,
    signerName,
    signerEmail,
    organization,
    signatureId = `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    signedAt = new Date(),
    documentHash = null,
    visualPosition = null
  }) {
    this.signerId = signerId;
    this.signerName = signerName;
    this.signerEmail = signerEmail;
    this.organization = organization;
    this.signatureId = signatureId;
    this.signedAt = signedAt;
    this.documentHash = documentHash;
    this.visualPosition = visualPosition;
  }

  /**
   * Setează poziția vizuală a semnăturii în document
   * @param {Object} position - Poziția semnăturii (pagină, x, y, lățime, înălțime)
   */
  setVisualPosition(position) {
    this.visualPosition = position;
  }

  /**
   * Setează hash-ul documentului
   * @param {string} hash - Hash-ul documentului
   */
  setDocumentHash(hash) {
    this.documentHash = hash;
  }

  /**
   * Verifică dacă informațiile despre semnătură sunt valide
   * @returns {boolean} True dacă informațiile sunt valide
   * @throws {Error} Dacă informațiile nu sunt valide
   */
  validate() {
    if (!this.signerId) {
      throw new Error('SignerId este obligatoriu');
    }
    if (!this.signerName) {
      throw new Error('SignerName este obligatoriu');
    }
    if (!this.signerEmail) {
      throw new Error('SignerEmail este obligatoriu');
    }
    if (!this.organization) {
      throw new Error('Organization este obligatoriu');
    }
    return true;
  }

  /**
   * Convertește informațiile în format JSON
   * @returns {Object} Obiectul JSON cu informațiile
   */
  toJSON() {
    return {
      signerId: this.signerId,
      signerName: this.signerName,
      signerEmail: this.signerEmail,
      organization: this.organization,
      signatureId: this.signatureId,
      signedAt: this.signedAt,
      documentHash: this.documentHash,
      visualPosition: this.visualPosition
    };
  }

  /**
   * Creează o instanță SignatureInfo din JSON
   * @param {Object} json - Obiectul JSON cu informațiile
   * @returns {SignatureInfo} O nouă instanță SignatureInfo
   */
  static fromJSON(json) {
    return new SignatureInfo(json);
  }

  /**
   * Verifică dacă semnătura are o poziție vizuală definită
   * @returns {boolean} True dacă semnătura are o poziție vizuală
   */
  hasVisualPosition() {
    return this.visualPosition !== null;
  }

  /**
   * Obține informații despre semnatar într-un format ușor de citit
   * @returns {string} Informații despre semnatar
   */
  getSignerDisplayInfo() {
    return `${this.signerName} (${this.signerEmail}) - ${this.organization}`;
  }

  /**
   * Obține data semnării într-un format localizat
   * @param {string} locale - Localizarea pentru formatare (implicit 'ro-RO')
   * @returns {string} Data semnării formatată
   */
  getFormattedSigningDate(locale = 'ro-RO') {
    return this.signedAt.toLocaleString(locale, {
      dateStyle: 'full',
      timeStyle: 'long'
    });
  }
}

module.exports = SignatureInfo; 