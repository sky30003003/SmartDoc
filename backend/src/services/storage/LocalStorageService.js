const fs = require('fs').promises;
const path = require('path');

class LocalStorageService {
  constructor() {
    this.baseDir = path.join(__dirname, '../../storage');
  }

  async uploadFile(file, organizationId, organizationName) {
    try {
      // Creăm un nume sigur pentru organizație (fără caractere speciale)
      const safeOrgName = organizationName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      // Creăm directorul organizației dacă nu există
      const orgDir = path.join(this.baseDir, safeOrgName);
      await fs.mkdir(orgDir, { recursive: true });

      // Generăm un nume unic pentru fișier
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${path.parse(file.originalname).name}_${timestamp}.pdf`;
      
      // Calea completă unde va fi salvat fișierul
      const filePath = path.join(orgDir, fileName);
      
      // Salvăm fișierul
      await fs.writeFile(filePath, file.buffer);

      // Returnăm calea relativă față de directorul de stocare
      return {
        path: filePath,
        url: `/storage/${safeOrgName}/${fileName}`
      };
    } catch (error) {
      console.error('Error in LocalStorageService.uploadFile:', error);
      throw new Error('Nu s-a putut salva fișierul: ' + error.message);
    }
  }

  async deleteFile(fileName, organizationId, organizationName) {
    try {
      const safeOrgName = organizationName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filePath = path.join(this.baseDir, safeOrgName, fileName);
      
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error in LocalStorageService.deleteFile:', error);
      throw new Error('Nu s-a putut șterge fișierul: ' + error.message);
    }
  }
}

module.exports = LocalStorageService; 