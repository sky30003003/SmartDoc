const StorageInterface = require('./StorageInterface');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

class LocalStorageService extends StorageInterface {
  constructor() {
    super();
    this.storageDir = path.join(__dirname, '../../storage');
    //this.ensureStorageExists();
  }

  /*async ensureStorageExists() {
    try {
      await fsPromises.access(this.storageDir);
    } catch {
      await fsPromises.mkdir(this.storageDir, { recursive: true });
    }
    console.log('Storage directory created:', this.storageDir);
  }*/

  sanitizeFileName(fileName) {
    // Separăm numele de extensie
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    
    // Sanitizăm doar numele, păstrăm extensia intactă
    const safeName = baseName
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    
    // Reunim numele sanitizat cu extensia originală
    return safeName + ext;
  }

  async uploadFile(file, organizationId, organizationName) {
    try {
      const safeOrgName = organizationName.toLowerCase().replace(/[^a-z0-9]/gi, '_');
      const storageDir = path.join(process.cwd(), 'src', 'storage', safeOrgName);
      
      if (!fs.existsSync(storageDir)) {
        await fsPromises.mkdir(storageDir, { recursive: true });
      }

      const fileName = file.originalname;
      const filePath = path.join(storageDir, fileName);

      await fsPromises.writeFile(filePath, file.buffer);

      return {
        fileId: fileName,
        url: `/storage/${safeOrgName}/${fileName}`,
        path: filePath
      };
    } catch (error) {
      console.error('Error in LocalStorageService:', error);
      throw error;
    }
  }

  async deleteFile(fileId, organizationId, organizationName) {
    const safeOrgName = this.sanitizeFileName(organizationName);
    const filePath = path.join(this.storageDir, safeOrgName, fileId);
    try {
      await fsPromises.unlink(filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Eroare la ștergerea fișierului');
    }
  }

  async getFileUrl(fileId, organizationId, organizationName) {
    const safeOrgName = this.sanitizeFileName(organizationName);
    return `/storage/${safeOrgName}/${fileId}`;
  }
}

module.exports = new LocalStorageService(); 