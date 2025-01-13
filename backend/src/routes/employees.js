const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const fileDb = require('../services/fileDb');
const { validateEmployee } = require('../middleware/validation');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Doar fișiere Excel sunt permise!'));
    }
  }
});

// Import angajați din Excel
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      console.log('Nu a fost primit niciun fișier');
      return res.status(400).json({ error: 'Nu a fost primit niciun fișier' });
    }

    console.log('Începere import Excel');
    console.log('File primit:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    
    const workbook = XLSX.read(req.file.buffer);
    console.log('Workbook citit, sheets:', workbook.SheetNames);
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log('Date citite din Excel:', data);

    if (!data || data.length === 0) {
      console.log('Nu există date în Excel');
      return res.status(400).json({ error: 'Nu există date în Excel' });
    }

    const employees = data.map(row => ({
      firstName: row['Prenume'],
      lastName: row['Nume'],
      email: row['email'],
      phone: row['telefon']
    }));
    console.log('Date mapate pentru import:', employees);

    const savedEmployees = await fileDb.addEmployees(req.auth.organizationId, employees);
    console.log('Angajați salvați cu succes:', savedEmployees);
    
    res.json({ 
      message: 'Angajații au fost importați cu succes!', 
      count: savedEmployees.length,
      data: savedEmployees 
    });
  } catch (error) {
    console.error('Eroare completă la import:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obține lista angajaților
router.get('/', async (req, res) => {
  try {
    console.log('GET /employees - Cerere primită pentru organizația:', req.auth.organizationId);
    const employees = await fileDb.getEmployees(req.auth.organizationId);
    console.log('GET /employees - Returnez angajații:', employees);
    res.json(employees);
  } catch (error) {
    console.error('GET /employees - Eroare:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizează un angajat
router.put('/:id', validateEmployee, async (req, res) => {
  try {
    const employee = await fileDb.updateEmployee(
      req.auth.organizationId,
      req.params.id,
      req.body
    );
    if (!employee) {
      return res.status(404).json({ error: 'Angajat negăsit' });
    }
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Șterge un angajat
router.delete('/:id', async (req, res) => {
  try {
    await fileDb.deleteEmployee(req.auth.organizationId, req.params.id);
    res.json({ message: 'Angajat șters cu succes!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Adaugă această rută nouă pentru trimiterea documentelor la semnat
router.post('/:employeeId/send-documents', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { organizationId } = req.auth;

    // Verificăm dacă angajatul aparține organizației
    const employee = (await fileDb.getEmployees(organizationId))
      .find(emp => emp.id === employeeId);

    if (!employee) {
      return res.status(404).json({ error: 'Angajat negăsit' });
    }

    // Actualizăm statusul documentelor angajatului
    const employeeDocuments = await fileDb.getEmployeeDocuments(organizationId);
    const updatedDocs = employeeDocuments
      .filter(doc => doc.employeeId === employeeId)
      .map(doc => ({
        ...doc,
        status: 'sent',
        updatedAt: new Date().toISOString()
      }));

    // Salvăm documentele actualizate
    const allDocs = employeeDocuments.map(doc => 
      updatedDocs.find(updated => updated.id === doc.id) || doc
    );
    
    await fileDb.updateEmployeeDocuments(allDocs);

    res.json({ 
      message: 'Documente trimise la semnat',
      updatedDocuments: updatedDocs 
    });
  } catch (error) {
    console.error('Eroare la trimiterea documentelor:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/employees
router.get('/', async (req, res) => {
  try {
    const employees = await fileDb.getEmployees(req.auth.organizationId);
    res.json(employees);
  } catch (error) {
    console.error('Eroare la obținerea angajaților:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/employees - Import angajați
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nu a fost primit niciun fișier' });
    }

    // Citim fișierul Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const employeesData = XLSX.utils.sheet_to_json(firstSheet);

    // Validăm datele
    if (!Array.isArray(employeesData) || employeesData.length === 0) {
      return res.status(400).json({ error: 'Fișierul nu conține date valide' });
    }

    // Importăm angajații
    const result = await fileDb.addEmployees(req.auth.organizationId, employeesData);

    // Returnăm rezultatul
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Eroare la importul angajaților:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 