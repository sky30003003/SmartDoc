const crypto = require('crypto');

/**
 * Serviciu pentru generarea și verificarea mărcilor temporale
 * În implementarea PAdES-Basic, folosim timestamp-uri locale
 * Pentru PAdES-T și PAdES-LT, acest serviciu ar trebui extins pentru a folosi un TSA (Time Stamping Authority)
 */
class TimestampService {
  /**
   * Generează o marcă temporală pentru un hash
   * @param {string} documentHash - Hash-ul documentului
   * @returns {Promise<Object>} Marca temporală generată
   */
  static async generateTimestamp(documentHash) {
    try {
      const timestamp = new Date();
      const timestampData = `${documentHash}|${timestamp.toISOString()}`;
      
      // Generăm un hash pentru marca temporală
      const timestampHash = crypto
        .createHash('sha256')
        .update(timestampData)
        .digest('hex');

      return {
        timestamp: timestamp.toISOString(),
        documentHash,
        timestampHash,
        type: 'PAdES-Basic-Timestamp',
        version: '1.0'
      };
    } catch (error) {
      throw new Error(`Eroare la generarea mărcii temporale: ${error.message}`);
    }
  }

  /**
   * Verifică o marcă temporală
   * @param {Object} timestamp - Marca temporală de verificat
   * @param {string} documentHash - Hash-ul documentului pentru verificare
   * @returns {Promise<Object>} Rezultatul verificării
   */
  static async verifyTimestamp(timestamp, documentHash) {
    try {
      // Verificăm dacă hash-ul documentului se potrivește
      if (timestamp.documentHash !== documentHash) {
        return {
          isValid: false,
          error: 'Hash-ul documentului nu corespunde cu cel din marca temporală'
        };
      }

      // Recalculăm hash-ul mărcii temporale
      const timestampData = `${documentHash}|${timestamp.timestamp}`;
      const calculatedHash = crypto
        .createHash('sha256')
        .update(timestampData)
        .digest('hex');

      // Verificăm hash-ul mărcii temporale
      if (calculatedHash !== timestamp.timestampHash) {
        return {
          isValid: false,
          error: 'Hash-ul mărcii temporale nu este valid'
        };
      }

      return {
        isValid: true,
        timestamp: new Date(timestamp.timestamp),
        documentHash: timestamp.documentHash,
        type: timestamp.type,
        version: timestamp.version
      };
    } catch (error) {
      throw new Error(`Eroare la verificarea mărcii temporale: ${error.message}`);
    }
  }

  /**
   * Extrage informații despre o marcă temporală
   * @param {Object} timestamp - Marca temporală
   * @returns {Object} Informații despre marca temporală
   */
  static getTimestampInfo(timestamp) {
    return {
      timestamp: new Date(timestamp.timestamp),
      type: timestamp.type,
      version: timestamp.version,
      documentHash: timestamp.documentHash
    };
  }

  /**
   * Verifică dacă o marcă temporală este mai veche decât alta
   * @param {Object} timestamp1 - Prima marcă temporală
   * @param {Object} timestamp2 - A doua marcă temporală
   * @returns {boolean} True dacă prima marcă temporală este mai veche
   */
  static isOlderThan(timestamp1, timestamp2) {
    const date1 = new Date(timestamp1.timestamp);
    const date2 = new Date(timestamp2.timestamp);
    return date1 < date2;
  }

  /**
   * Calculează diferența de timp între două mărci temporale
   * @param {Object} timestamp1 - Prima marcă temporală
   * @param {Object} timestamp2 - A doua marcă temporală
   * @returns {Object} Diferența de timp în diferite unități
   */
  static getTimeDifference(timestamp1, timestamp2) {
    const date1 = new Date(timestamp1.timestamp);
    const date2 = new Date(timestamp2.timestamp);
    const diffMs = Math.abs(date2 - date1);

    return {
      milliseconds: diffMs,
      seconds: Math.floor(diffMs / 1000),
      minutes: Math.floor(diffMs / (1000 * 60)),
      hours: Math.floor(diffMs / (1000 * 60 * 60)),
      days: Math.floor(diffMs / (1000 * 60 * 60 * 24))
    };
  }
}

module.exports = TimestampService; 