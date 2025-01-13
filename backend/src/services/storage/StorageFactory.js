const LocalStorageService = require('./LocalStorageService');

class StorageFactory {
  static getStorageService() {
    // În viitor, aici putem adăuga logica pentru a alege între diferite servicii
    // bazat pe configurație (env variables)
    return LocalStorageService;
  }
}

module.exports = StorageFactory; 