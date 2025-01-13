const Employee = require('../models/Employee');
const Document = require('../models/Document');
const Organization = require('../models/Organization');
const path = require('path');
const fs = require('fs');
const { createEmployeeFolder, copyDocumentToEmployee, deleteEmployeeDocument } = require('../utils/fileUtils');

exports.getAllEmployees = async (req, res) => {
  try {
    // Găsim toți angajații
    const employees = await Employee.find({ organization: req.user.organization })
      .sort({ createdAt: -1 });

    if (!employees || employees.length === 0) {
      return res.json([]);
    }

    // Găsim toate documentele organizației
    const documents = await Document.find({ organization: req.user.organization });
    
    // Creăm un map pentru a ține evidența documentelor per angajat
    const employeeDocuments = {};
    documents.forEach(doc => {
      doc.employeeCopies.forEach(copy => {
        const empId = copy.employee.toString();
        if (!employeeDocuments[empId]) {
          employeeDocuments[empId] = [];
        }
        employeeDocuments[empId].push({
          documentId: doc._id,
          title: doc.title,
          status: copy.status || 'pending',
          signedAt: copy.signedAt,
          path: copy.path
        });
      });
    });

    // Adăugăm informațiile despre documente la fiecare angajat
    const enrichedEmployees = employees.map(emp => {
      const empObj = emp.toObject();
      empObj.documents = employeeDocuments[emp._id.toString()] || [];
      empObj.documentCount = empObj.documents.length;
      return empObj;
    });

    res.json(enrichedEmployees);
  } catch (error) {
    console.error('Error getting employees:', error);
    res.status(500).json({ message: 'Eroare la obținerea angajaților' });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const { firstName, lastName, ...otherData } = req.body;
    
    // Creăm angajatul în DB
    const employee = new Employee({
      firstName,
      lastName,
      organization: req.user.organization,
      ...otherData
    });
    await employee.save();

    // Găsim organizația și toate documentele ei
    const organization = await Organization.findById(req.user.organization);
    console.log('Organization:', organization);
    const documents = await Document.find({ organization: employee.organization });
    console.log('Found documents:', documents);

    // Creăm folderul angajatului și copiem toate documentele
    const employeePath = createEmployeeFolder(organization.name, `${firstName}_${lastName}`);
    console.log('Created employee folder at:', employeePath);
    
    // Copiem fiecare document și actualizăm Document cu noua copie
    await Promise.all(documents.map(async (doc) => {
      console.log('Processing document:', doc);
      
      // Încercăm să găsim documentul cu toate detaliile
      const fullDoc = await Document.findById(doc._id);
      console.log('Full document:', fullDoc);
      
      // Verificăm dacă documentul există în storage
      const organization = await Organization.findById(doc.organization);
      const orgFolderName = organization.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').trim();
      
      // Citim conținutul folderului organizației
      const orgPath = path.join(process.cwd(), 'src', 'storage', orgFolderName);
      console.log('Organization folder:', orgPath);
      
      if (!fs.existsSync(orgPath)) {
        console.log('Organization folder not found');
        return;
      }
      
      // Listăm fișierele din folderul organizației
      const files = fs.readdirSync(orgPath);
      console.log('Files in organization folder:', files);
      
      if (files.length === 0) {
        console.log('No files found in organization folder');
        return;
      }
      
      // Folosim primul fișier găsit (sau logică mai complexă dacă e necesar)
      const sourceFile = files[0];
      const originalPath = path.join(orgPath, sourceFile);
      console.log('Using source file:', originalPath);

      const documentPath = await copyDocumentToEmployee(
        originalPath,
        employeePath,
        sourceFile
      );
      console.log('Copied to:', documentPath);

      await Document.findByIdAndUpdate(doc._id, {
        $push: {
          employeeCopies: {
            employee: employee._id,
            path: documentPath
          }
        }
      });
    }));

    res.status(201).json(employee);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ message: 'Eroare la crearea angajatului' });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Angajatul nu a fost găsit' });
    }

    const organization = await Organization.findById(employee.organization);
    
    // Ștergem folderul angajatului cu toate documentele
    const employeePath = createEmployeeFolder(
      organization.name,
      `${employee.firstName}_${employee.lastName}`
    );
    
    if (fs.existsSync(employeePath)) {
      fs.rmSync(employeePath, { recursive: true, force: true });
    }

    // Ștergem referințele din colecția Document
    await Document.updateMany(
      { organization: employee.organization },
      { $pull: { employeeCopies: { employee: employee._id } } }
    );

    // Ștergem angajatul
    await Employee.deleteOne({ _id: employee._id });

    res.json({ message: 'Angajat șters cu succes' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ message: 'Eroare la ștergerea angajatului' });
  }
};

exports.getEmployeeCount = async (req, res) => {
  try {
    const count = await Employee.countDocuments({ organization: req.user.organization });
    res.json({ count });
  } catch (error) {
    console.error('Error getting employee count:', error);
    res.status(500).json({ message: 'Eroare la obținerea numărului de angajați' });
  }
};

exports.getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({
      _id: req.params.id,
      organization: req.user.organization
    });

    if (!employee) {
      return res.status(404).json({ message: 'Angajatul nu a fost găsit' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Error getting employee:', error);
    res.status(500).json({ message: 'Eroare la obținerea datelor angajatului' });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, cnp } = req.body;
    
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization },
      { firstName, lastName, email, phone, cnp, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({ message: 'Angajatul nu a fost găsit' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ message: 'Eroare la actualizarea datelor angajatului' });
  }
};

exports.deleteEmployeeDocument = async (req, res) => {
  try {
    const { employeeId, documentId } = req.params;

    // Verificăm dacă documentul și angajatul există și aparțin organizației
    const document = await Document.findOne({
      _id: documentId,
      organization: req.user.organization,
      'employeeCopies.employee': employeeId
    });

    if (!document) {
      return res.status(404).json({ message: 'Documentul nu a fost găsit' });
    }

    // Găsim copia specifică a angajatului
    const employeeCopy = document.employeeCopies.find(
      copy => copy.employee.toString() === employeeId
    );

    if (!employeeCopy) {
      return res.status(404).json({ message: 'Copia documentului nu a fost găsită' });
    }

    // Ștergem fișierul fizic
    if (employeeCopy.path && fs.existsSync(employeeCopy.path)) {
      await fs.promises.unlink(employeeCopy.path);
    }

    // Eliminăm copia din array-ul employeeCopies
    await Document.updateOne(
      { _id: documentId },
      { $pull: { employeeCopies: { employee: employeeId } } }
    );

    res.json({ message: 'Document șters cu succes' });
  } catch (error) {
    console.error('Error deleting employee document:', error);
    res.status(500).json({ message: 'Eroare la ștergerea documentului' });
  }
}; 