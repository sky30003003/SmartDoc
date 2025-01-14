const LocalStorageService = require('./LocalStorageService');

class StorageFactory {
  static getStorageService() {
    // În viitor, aici putem adăuga logica pentru a alege între diferite servicii de stocare
    // (local, S3, etc.) în funcție de configurație
    return new LocalStorageService();
  }
}

module.exports = StorageFactory; 