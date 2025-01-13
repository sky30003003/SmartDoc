class StorageInterface {
  async uploadFile(file, organizationId) {
    throw new Error('Method not implemented');
  }

  async deleteFile(fileId) {
    throw new Error('Method not implemented');
  }

  async getFileUrl(fileId) {
    throw new Error('Method not implemented');
  }
}

module.exports = StorageInterface; 