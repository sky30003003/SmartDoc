/**
 * Model pentru metadatele unei semnături digitale
 * Aceste metadate sunt stocate în documentul PDF și pot fi folosite pentru validare
 */
class SignatureMetadata {
  constructor({
    version = '1.0',
    signatureType = 'PAdES-Basic',
    signatureFormat = 'CAdES',
    signatureLevel = 'B-B',
    signatureAlgorithm = 'SHA256withRSA',
    certificateInfo = {},
    timestamps = [],
    revocationInfo = {},
    customData = {}
  }) {
    this.version = version;
    this.signatureType = signatureType;
    this.signatureFormat = signatureFormat;
    this.signatureLevel = signatureLevel;
    this.signatureAlgorithm = signatureAlgorithm;
    this.certificateInfo = certificateInfo;
    this.timestamps = timestamps;
    this.revocationInfo = revocationInfo;
    this.customData = customData;
  }

  /**
   * Adaugă informații despre certificat
   * @param {Object} info - Informații despre certificat
   */
  setCertificateInfo(info) {
    this.certificateInfo = {
      ...this.certificateInfo,
      ...info
    };
  }

  /**
   * Adaugă o marcă temporală
   * @param {Object} timestamp - Informații despre marca temporală
   */
  addTimestamp(timestamp) {
    this.timestamps.push({
      ...timestamp,
      addedAt: new Date()
    });
  }

  /**
   * Adaugă informații despre revocare
   * @param {Object} info - Informații despre revocare
   */
  setRevocationInfo(info) {
    this.revocationInfo = {
      ...this.revocationInfo,
      ...info,
      updatedAt: new Date()
    };
  }

  /**
   * Adaugă date personalizate
   * @param {string} key - Cheia datelor
   * @param {any} value - Valoarea datelor
   */
  setCustomData(key, value) {
    this.customData[key] = value;
  }

  /**
   * Verifică dacă metadatele sunt valide
   * @returns {boolean} True dacă metadatele sunt valide
   * @throws {Error} Dacă metadatele nu sunt valide
   */
  validate() {
    if (!this.version) {
      throw new Error('Version este obligatoriu');
    }
    if (!this.signatureType) {
      throw new Error('SignatureType este obligatoriu');
    }
    if (!this.signatureFormat) {
      throw new Error('SignatureFormat este obligatoriu');
    }
    if (!this.signatureLevel) {
      throw new Error('SignatureLevel este obligatoriu');
    }
    if (!this.signatureAlgorithm) {
      throw new Error('SignatureAlgorithm este obligatoriu');
    }
    return true;
  }

  /**
   * Convertește metadatele în format JSON
   * @returns {Object} Obiectul JSON cu metadatele
   */
  toJSON() {
    return {
      version: this.version,
      signatureType: this.signatureType,
      signatureFormat: this.signatureFormat,
      signatureLevel: this.signatureLevel,
      signatureAlgorithm: this.signatureAlgorithm,
      certificateInfo: this.certificateInfo,
      timestamps: this.timestamps,
      revocationInfo: this.revocationInfo,
      customData: this.customData
    };
  }

  /**
   * Creează o instanță SignatureMetadata din JSON
   * @param {Object} json - Obiectul JSON cu metadatele
   * @returns {SignatureMetadata} O nouă instanță SignatureMetadata
   */
  static fromJSON(json) {
    return new SignatureMetadata(json);
  }

  /**
   * Verifică dacă semnătura are marca temporală
   * @returns {boolean} True dacă semnătura are cel puțin o marcă temporală
   */
  hasTimestamp() {
    return this.timestamps.length > 0;
  }

  /**
   * Obține ultima marcă temporală
   * @returns {Object|null} Ultima marcă temporală sau null dacă nu există
   */
  getLatestTimestamp() {
    if (this.timestamps.length === 0) {
      return null;
    }
    return this.timestamps[this.timestamps.length - 1];
  }

  /**
   * Verifică dacă certificatul este revocat
   * @returns {boolean} True dacă certificatul este revocat
   */
  isCertificateRevoked() {
    return this.revocationInfo.isRevoked || false;
  }
}

module.exports = SignatureMetadata; 