const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

async function createEmployeeFolder(employeeFolderPath) {
  await fsPromises.mkdir(employeeFolderPath, { recursive: true });
}

async function copyDocumentToEmployee(sourcePath, destinationPath) {
  await fsPromises.copyFile(sourcePath, destinationPath);
}

async function deleteEmployeeDocument(documentPath) {
  if (fs.existsSync(documentPath)) {
    await fsPromises.unlink(documentPath);
  }
}

module.exports = {
  createEmployeeFolder,
  copyDocumentToEmployee,
  deleteEmployeeDocument
}; 