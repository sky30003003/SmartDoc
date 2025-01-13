const fs = require('fs');
const path = require('path');

const createEmployeeFolder = (organizationName, employeeName) => {
  const orgFolderName = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '_').trim();
  const empFolderName = employeeName.toLowerCase().replace(/[^a-z0-9]+/g, '_').trim();
  const employeePath = path.join(process.cwd(), 'src', 'storage', orgFolderName, 'employees', empFolderName);
  
  if (!fs.existsSync(employeePath)) {
    fs.mkdirSync(employeePath, { recursive: true });
  }
  
  return employeePath;
};

const copyDocumentToEmployee = async (sourcePath, employeePath, fileName) => {
  const destinationPath = path.join(employeePath, fileName);
  await fs.promises.copyFile(sourcePath, destinationPath);
  return destinationPath;
};

const deleteEmployeeDocument = async (documentPath) => {
  if (fs.existsSync(documentPath)) {
    await fs.promises.unlink(documentPath);
  }
};

module.exports = {
  createEmployeeFolder,
  copyDocumentToEmployee,
  deleteEmployeeDocument
}; 