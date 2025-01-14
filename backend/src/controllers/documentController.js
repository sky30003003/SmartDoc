const Document = require('../models/Document');
const StorageFactory = require('../services/storage/StorageFactory');
const multer = require('multer');
const Organization = require('../models/Organization');
const path = require('path');
const { createEmployeeFolder, copyDocumentToEmployee, deleteEmployeeDocument } = require('../utils/fileUtils');
const Employee = require('../models/Employee');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const crypto = require('crypto');
const QRCode = require('qrcode');
const fsPromises = require('fs').promises;
const PAdESService = require('../services/signatures/PAdESService');

const storage = StorageFactory.getStorageService();
const upload = multer({ storage: multer.memoryStorage() }).single('file');

/**
 * Funcție pentru crearea copiilor documentului pentru toți angajații
 * TODO: Această funcționalitate va fi implementată ulterior într-un endpoint separat
 * Exemplu de utilizare:
 * const employeeCopies = await createEmployeeCopies(document, organization);
 * document.employeeCopies = employeeCopies;
 * await document.save();
 */
const createEmployeeCopies = async (document, organization) => {
  const employees = await Employee.find({ organization: organization._id });
  console.log('Found employees:', employees);
  console.log('Source file path:', document.fileUrl);
  
  const employeeCopies = await Promise.all(employees.map(async (employee) => {
    const employeePath = createEmployeeFolder(
      organization.name, 
      `${employee.firstName}_${employee.lastName}`
    );
    
    console.log('Employee folder:', employeePath);
    
    const documentPath = await copyDocumentToEmployee(
      document.fileUrl,
      employeePath,
      document.originalName
    );
    
    return {
      employee: employee._id,
      path: documentPath
    };
  }));

  return employeeCopies;
};

exports.getAllDocuments = async (req, res) => {
  try {
    console.log('=== Getting documents for organization ===');
    console.log('User organization:', req.user.organization);

    const documents = await Document.find({ organizationId: req.user.organization })
      .select('title description originalName fileType fileUrl fileSize uploadedAt organizationId employeeCopies signatureConfig')
      .sort({ uploadedAt: -1 });

    console.log('Found documents:', documents.length);
    console.log('Raw documents:', JSON.stringify(documents, null, 2));

    // Obținem toți angajații organizației
    const employees = await Employee.find({ organization: req.user.organization })
      .select('_id firstName lastName');

    console.log('Found employees:', employees.length);

    // Creăm un map pentru căutare rapidă
    const employeeMap = employees.reduce((map, emp) => {
      map[emp._id.toString()] = `${emp.firstName} ${emp.lastName}`;
      return map;
    }, {});

    console.log('Employee map:', employeeMap);

    // Adăugăm numele angajaților în documentele returnate
    const enrichedDocuments = documents.map(doc => {
      const docObj = doc.toObject();
      if (docObj.employeeCopies) {
        docObj.employeeCopies = docObj.employeeCopies.map(copy => ({
          ...copy,
          employeeName: employeeMap[copy.employee.toString()]
        }));
      }
      return docObj;
    });

    console.log('Enriched documents:', JSON.stringify(enrichedDocuments, null, 2));
    console.log('=== End of getting documents ===');

    res.json(enrichedDocuments);
  } catch (error) {
    console.error('Error getting documents:', error);
    res.status(500).json({ message: 'Eroare la obținerea documentelor' });
  }
};

exports.uploadDocument = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: 'Niciun fișier încărcat' });

    // Validăm că fișierul este PDF
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Sunt acceptate doar fișiere PDF' });
    }

    const { title, description, signatureConfig } = req.body;
    const file = req.file;

    const organization = await Organization.findById(req.user.organization);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită' });
    }

    try {
      // Verificăm dacă există deja un document cu același titlu în organizație
      const existingDocTitle = await Document.findOne({
        organizationId: req.user.organization,
        title: title
      });

      if (existingDocTitle) {
        return res.status(400).json({ 
          message: 'Există deja un document cu acest titlu în organizație' 
        });
      }

      // Verificăm dacă există deja un document cu același nume original în organizație
      const existingDocName = await Document.findOne({
        organizationId: req.user.organization,
        originalName: file.originalname
      });

      if (existingDocName) {
        return res.status(400).json({ 
          message: 'Există deja un document cu acest nume în organizație' 
        });
      }

      const uploadResult = await storage.uploadFile(file, req.user.organization, organization.name);
      console.log('Upload result:', uploadResult);

      if (!uploadResult.path) {
        throw new Error('Upload result missing file path');
      }

      // Parsăm configurația semnăturilor
      let parsedSignatureConfig = [];
      if (signatureConfig) {
        try {
          parsedSignatureConfig = JSON.parse(signatureConfig);
        } catch (error) {
          console.error('Error parsing signature config:', error);
          return res.status(400).json({ message: 'Configurația semnăturilor este invalidă' });
        }
      }

      // Inițializăm progresul semnăturilor
      const signatureProgress = {
        currentStep: 0,
        totalSteps: parsedSignatureConfig.length,
        completedSignatures: []
      };

      const document = new Document({
        title,
        description,
        originalName: file.originalname,
        path: uploadResult.path,
        organizationId: req.user.organization,
        uploadedBy: req.user.userId,
        signatureConfig: parsedSignatureConfig,
        signatureProgress,
        employeeCopies: [] // Inițializăm array-ul gol pentru copii
      });

      await document.save();

      // Dacă există configurație de semnături, trimitem notificări către primii semnatari
      if (parsedSignatureConfig.length > 0) {
        const firstSigners = parsedSignatureConfig.filter(config => config.order === 1);
        if (firstSigners.length > 0) {
          await notifyNextSigner(document);
        }
      }

      res.status(201).json(document);
    } catch (error) {
      console.error('Error uploading document:', error);
      // Verificăm dacă eroarea este de tip duplicate key
      if (error.code === 11000) {
        if (error.keyPattern.title) {
          return res.status(400).json({ 
            message: 'Există deja un document cu acest titlu în organizație' 
          });
        }
        if (error.keyPattern.originalName) {
          return res.status(400).json({ 
            message: 'Există deja un document cu acest nume în organizație' 
          });
        }
      }
      res.status(500).json({ message: 'Eroare la încărcarea documentului: ' + error.message });
    }
  });
};

exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      organizationId: req.user.organization
    }).populate('employeeCopies.employee');

    if (!document) {
      return res.status(404).json({ message: 'Documentul nu a fost găsit' });
    }

    const organization = await Organization.findById(req.user.organization);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită' });
    }

    // Ștergem documentul original
    const fileId = document.fileUrl.split('/').pop();
    console.log('Deleting original document:', fileId);
    await storage.deleteFile(fileId, document.organization, organization.name);
    console.log('Original document deleted successfully');

    // Ștergem copiile de la angajați
    console.log('Employee copies to delete:', document.employeeCopies);
    await Promise.all(document.employeeCopies.map(async (copy) => {
      console.log('Attempting to delete employee copy at path:', copy.path);
      try {
        if (!copy.path) {
          console.log('No path found for copy:', copy);
          return;
        }
        if (!fs.existsSync(copy.path)) {
          console.log('File does not exist at path:', copy.path);
          return;
        }
        await deleteEmployeeDocument(copy.path);
        console.log('Successfully deleted employee copy at path:', copy.path);
      } catch (error) {
        console.error('Error deleting employee copy:', error);
      }
    }));

    await Document.deleteOne({ _id: document._id });
    console.log('Document record deleted from database');

    res.json({ message: 'Document șters cu succes' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Eroare la ștergerea documentului: ' + error.message });
  }
};

exports.downloadDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      organizationId: req.user.organization
    });

    if (!document) {
      return res.status(404).json({ message: 'Documentul nu a fost găsit' });
    }

    const organization = await Organization.findById(req.user.organization);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită' });
    }

    const safeOrgName = organization.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const storageDir = path.join(__dirname, '../storage');
    const filePath = path.join(storageDir, safeOrgName, document.fileUrl.split('/').pop());

    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      return res.status(404).json({ message: 'Fișierul nu a fost găsit' });
    }

    res.download(filePath, document.originalName);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Eroare la descărcarea documentului' });
  }
};

exports.sendToSign = async (req, res) => {
  try {
    // Găsim documentul și verificăm dacă aparține organizației
    const document = await Document.findOne({
      _id: req.params.id,
      organizationId: req.user.organization
    });

    if (!document) {
      return res.status(404).json({ message: 'Documentul nu a fost găsit' });
    }

    console.log('Sending document to sign:', document);

    // Configurăm transportul de email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Pregătim trimiterea email-urilor
    const emailPromises = document.employeeCopies.map(async (copy) => {
      // Găsim angajatul
      const employee = await Employee.findById(copy.employee);
      if (!employee) return null;

      // Generăm link-ul unic pentru semnare
      const signLink = `${process.env.FRONTEND_URL}/sign-document/${document._id}/${copy.employee}`;

      // Trimitem email-ul
      return transporter.sendMail({
        from: process.env.SMTP_FROM || '"SmartDoc" <noreply@smartdoc.com>',
        to: employee.email,
        subject: `Document de semnat: ${document.title}`,
        html: `
          <h2>Aveți un document nou de semnat</h2>
          <p>Documentul "${document.title}" necesită semnătura dumneavoastră.</p>
          <p>Pentru a semna documentul, accesați următorul link:</p>
          <a href="${signLink}" style="display:inline-block;padding:12px 24px;background-color:#1976d2;color:white;text-decoration:none;border-radius:4px;">
            Semnează documentul
          </a>
          <p style="margin-top:24px;color:#666;">
            Acest link este unic și poate fi folosit doar pentru semnarea documentului dumneavoastră.
          </p>
        `
      });
    });

    // Trimitem toate email-urile
    const results = await Promise.all(emailPromises);
    const sentCount = results.filter(Boolean).length;

    // Actualizăm statusul pentru fiecare copie în parte
    const updatePromises = document.employeeCopies.map(copy => 
      Document.updateOne(
        { 
          _id: document._id,
          'employeeCopies.employee': copy.employee 
        },
        { 
          $set: { 
            'employeeCopies.$.status': 'pending_signature',
            'employeeCopies.$.sentAt': new Date()
          } 
        }
      )
    );

    await Promise.all(updatePromises);
    console.log('Updated document copies status to pending_signature');

    res.json({ 
      message: 'Documentul a fost trimis spre semnare',
      sentCount 
    });
  } catch (error) {
    console.error('Error sending document for signing:', error);
    res.status(500).json({ message: 'Eroare la trimiterea documentului spre semnare' });
  }
};

exports.getSigningDetails = async (req, res) => {
  try {
    console.log('Getting signing details for document:', {
      documentId: req.params.id,
      employeeId: req.params.employeeId
    });

    // Găsim documentul și verificăm dacă angajatul are acces la el
    const document = await Document.findOne({
      _id: req.params.id,
      'employeeCopies.employee': req.params.employeeId
    }).populate('organization');

    if (!document) {
      console.log('Document not found or invalid link');
      return res.status(404).json({ message: 'Document negăsit sau link invalid' });
    }

    console.log('Document found:', {
      id: document._id,
      title: document.title,
      signatureSettings: document.organization.signatureSettings
    });

    // Găsim angajatul
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) {
      console.log('Employee not found');
      return res.status(404).json({ message: 'Angajat negăsit' });
    }

    console.log('Employee found:', {
      id: employee._id,
      name: `${employee.firstName} ${employee.lastName}`
    });

    // Găsim copia specifică a angajatului
    const employeeCopy = document.employeeCopies.find(
      copy => copy.employee.toString() === req.params.employeeId
    );

    if (!employeeCopy) {
      console.log('Employee copy not found');
      return res.status(404).json({ message: 'Copia documentului nu a fost găsită' });
    }

    console.log('Employee copy found:', {
      status: employeeCopy.status,
      path: employeeCopy.path
    });

    if (employeeCopy.status === 'signed') {
      console.log('Document already signed');
      return res.status(400).json({ message: 'Documentul a fost deja semnat' });
    }

    // Returnăm detaliile necesare pentru semnare
    res.json({
      document: {
        _id: document._id,
        title: document.title,
        signatureSettings: document.organization.signatureSettings
      },
      employee: {
        _id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        cnp: employee.cnp
      },
      employeeCopy: {
        status: employeeCopy.status,
        sentAt: employeeCopy.sentAt,
        path: employeeCopy.path
      }
    });
  } catch (error) {
    console.error('Error getting signing details:', error);
    res.status(500).json({ message: 'Eroare la obținerea detaliilor pentru semnare' });
  }
};

exports.signDocument = async (req, res) => {
  try {
    const { id, employeeId } = req.params;

    // Găsim documentul și verificăm dacă există
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: 'Documentul nu a fost găsit' });
    }

    // Verificăm dacă angajatul poate semna documentul
    const canSignNow = await document.canSign(employeeId);
    if (!canSignNow) {
      return res.status(400).json({ 
        message: 'Nu puteți semna acest document încă. Așteptați semnăturile anterioare.' 
      });
    }

    // Găsim angajatul și verificăm dacă există
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Angajatul nu a fost găsit' });
    }

    // Găsim organizația și verificăm dacă există
    const organization = await Organization.findById(document.organizationId);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită' });
    }

    // Găsim copia documentului pentru angajat
    const employeeCopy = document.employeeCopies.find(
      copy => copy.employee.toString() === employeeId
    );

    if (!employeeCopy) {
      return res.status(404).json({ message: 'Copia documentului nu a fost găsită' });
    }

    if (employeeCopy.status === 'signed') {
      return res.status(400).json({ message: 'Documentul a fost deja semnat' });
    }

    // Generăm un ID unic pentru semnătură
    const signatureId = `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Inițializăm serviciul PAdES cu setările organizației
      await PAdESService.initialize({
        basePath: path.join(__dirname, '../secure_storage'),
        validityYears: organization.certificateSettings?.validityYears || 5,
        visualSignature: organization.signatureSettings?.printSignature || false,
        includeQR: organization.signatureSettings?.includeQRCode || false
      });

      // Citim documentul PDF
      const pdfBuffer = await fsPromises.readFile(employeeCopy.path);

      // Semnăm documentul
      const { document: signedPdfBuffer, signature } = await PAdESService.signDocument(
        pdfBuffer,
        {
          id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          organization: organization.name
        },
        {
          title: document.title,
          signatureId
        }
      );

      // Salvăm documentul semnat
      await fsPromises.writeFile(employeeCopy.path, signedPdfBuffer);

      // Actualizăm documentul cu informațiile semnăturii
      const signatureConfig = document.signatureConfig.find(
        config => config.role === employee.role
      );

      // Adăugăm semnătura la progres
      document.signatureProgress.completedSignatures.push({
        role: employee.role,
        signedAt: new Date(),
        signedBy: employee._id,
        order: signatureConfig.order
      });

      // Actualizăm progresul semnăturilor
      document.signatureProgress.currentStep++;

      // Actualizăm copia angajatului
      const result = await Document.findOneAndUpdate(
        { 
          _id: document._id,
          'employeeCopies.employee': employeeId 
        },
        { 
          $set: { 
            'employeeCopies.$.status': 'signed',
            'employeeCopies.$.signedAt': signature.info.signedAt,
            'employeeCopies.$.documentHash': signature.info.documentHash,
            'employeeCopies.$.signatureId': signature.info.signatureId,
            'employeeCopies.$.signatureMetadata': signature.metadata,
            signatureProgress: document.signatureProgress
          }
        },
        { new: true }
      );

      if (!result) {
        throw new Error('Nu s-a putut actualiza statusul documentului');
      }

      // Notificăm următorul semnatar dacă există
      await notifyNextSigner(document);

      res.json({ 
        message: 'Document semnat cu succes',
        status: 'signed',
        signedAt: signature.info.signedAt,
        signatureInfo: {
          documentHash: signature.info.documentHash,
          timestamp: signature.metadata.timestamps[0],
          signedBy: signature.info.getSignerDisplayInfo(),
          signatureId: signature.info.signatureId
        }
      });

    } catch (error) {
      console.error('Error in PDF processing:', error);
      throw error;
    }

  } catch (error) {
    console.error('Error signing document:', error);
    res.status(500).json({ 
      message: 'Eroare la semnarea documentului',
      error: error.message 
    });
  }
};

// Funcție pentru notificarea următorului semnatar
const notifyNextSigner = async (document) => {
  try {
    // Găsim următoarea configurație de semnătură
    const nextSignatureConfig = document.signatureConfig.find(config => 
      !document.signatureProgress.completedSignatures.some(
        sig => sig.role === config.role
      )
    );

    if (!nextSignatureConfig) {
      console.log('Toate semnăturile au fost completate');
      return;
    }

    // Configurăm transportul de email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Găsim angajații cu rolul următor
    const nextSigners = await Employee.find({ 
      organization: document.organizationId,
      role: nextSignatureConfig.role 
    });

    // Trimitem notificări către toți angajații care trebuie să semneze
    const emailPromises = nextSigners.map(async (signer) => {
      const signLink = `${process.env.FRONTEND_URL}/sign-document/${document._id}/${signer._id}`;

      return transporter.sendMail({
        from: process.env.SMTP_FROM || '"SmartDoc" <noreply@smartdoc.com>',
        to: signer.email,
        subject: `Document de semnat: ${document.title}`,
        html: `
          <h2>Este rândul dumneavoastră să semnați</h2>
          <p>Documentul "${document.title}" necesită semnătura dumneavoastră.</p>
          <p>Semnăturile anterioare au fost completate și acum este rândul dumneavoastră.</p>
          <p>Pentru a semna documentul, accesați următorul link:</p>
          <a href="${signLink}" style="display:inline-block;padding:12px 24px;background-color:#1976d2;color:white;text-decoration:none;border-radius:4px;">
            Semnează documentul
          </a>
          <p style="margin-top:24px;color:#666;">
            Acest link este unic și poate fi folosit doar pentru semnarea documentului dumneavoastră.
          </p>
        `
      });
    });

    await Promise.all(emailPromises);
    console.log(`Notificări trimise către ${nextSigners.length} angajați cu rolul ${nextSignatureConfig.role}`);

  } catch (error) {
    console.error('Error notifying next signers:', error);
    throw error;
  }
};

exports.downloadDocumentForSigning = async (req, res) => {
  try {
    const { id: documentId, employeeId } = req.params;
    console.log('Downloading document for signing:', { documentId, employeeId });
    
    // Setăm header-urile CORS pentru a permite doar originea frontend-ului
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Verificăm dacă documentul și angajatul sunt valizi
    const document = await Document.findOne({
      _id: documentId,
      'employeeCopies.employee': employeeId
    });

    if (!document) {
      console.log('Document not found:', { documentId, employeeId });
      return res.status(404).json({ message: 'Document negăsit sau link invalid' });
    }

    // Găsim copia specifică a angajatului
    const employeeCopy = document.employeeCopies.find(
      copy => copy.employee.toString() === employeeId
    );

    if (!employeeCopy) {
      console.log('Employee copy not found:', { documentId, employeeId });
      return res.status(404).json({ message: 'Copia documentului nu a fost găsită' });
    }

    console.log('Found document copy at path:', employeeCopy.path);

    // Verificăm dacă fișierul există
    if (!fs.existsSync(employeeCopy.path)) {
      console.error('File does not exist at path:', employeeCopy.path);
      return res.status(404).json({ message: 'Fișierul nu a fost găsit' });
    }

    // Setăm header-ul Content-Type pentru PDF și cache control
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-cache');
    
    // Trimitem fișierul
    res.sendFile(employeeCopy.path, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ message: 'Eroare la trimiterea fișierului' });
      } else {
        console.log('File sent successfully');
      }
    });
  } catch (error) {
    console.error('Error downloading document for signing:', error);
    res.status(500).json({ message: 'Eroare la descărcarea documentului' });
  }
};

exports.verifySignature = async (req, res) => {
  try {
    const { id, signatureId } = req.params;

    // Găsește documentul
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: 'Documentul nu a fost găsit' });
    }

    // Găsește copia semnată folosind signatureId
    const signedCopy = document.employeeCopies.find(copy => copy.signatureId === signatureId);
    if (!signedCopy) {
      return res.status(404).json({ message: 'Semnătura nu a fost găsită' });
    }

    // Verifică dacă documentul este semnat
    if (signedCopy.status !== 'signed') {
      return res.status(400).json({ message: 'Documentul nu este semnat' });
    }

    // Inițializăm serviciul PAdES
    await PAdESService.initialize({
      basePath: path.join(__dirname, '../secure_storage')
    });

    // Citim documentul PDF
    const pdfBuffer = await fsPromises.readFile(signedCopy.path);

    // Verificăm semnăturile
    const verificationResults = await PAdESService.verifyDocument(pdfBuffer);

    // Găsim rezultatul pentru semnătura specificată
    const signatureResult = verificationResults.find(
      result => result.signatureId === signatureId
    );

    if (!signatureResult) {
      return res.status(404).json({ message: 'Semnătura nu a fost găsită în document' });
    }

    return res.json({
      isValid: signatureResult.isValid,
      signedBy: signatureResult.signerInfo.name,
      signedAt: signedCopy.signedAt,
      documentHash: signatureResult.documentHash,
      errors: signatureResult.errors
    });

  } catch (error) {
    console.error('Eroare la verificarea semnăturii:', error);
    return res.status(500).json({ message: 'Eroare la verificarea semnăturii' });
  }
};

exports.bulkDelete = async (req, res) => {
  try {
    const { documentIds } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ message: 'Lista de documente de șters este invalidă' });
    }

    // Găsim toate documentele care aparțin organizației
    const documents = await Document.find({
      _id: { $in: documentIds },
      organizationId: req.user.organization
    }).populate('employeeCopies.employee');

    if (documents.length === 0) {
      return res.status(404).json({ message: 'Nu s-au găsit documentele specificate' });
    }

    const organization = await Organization.findById(req.user.organization);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită' });
    }

    // Ștergem fiecare document și copiile sale
    for (const document of documents) {
      // Ștergem documentul original
      const fileId = document.fileUrl.split('/').pop();
      console.log('Deleting original document:', fileId);
      await storage.deleteFile(fileId, document.organization, organization.name);
      console.log('Original document deleted successfully');

      // Ștergem copiile de la angajați
      console.log('Employee copies to delete:', document.employeeCopies);
      await Promise.all(document.employeeCopies.map(async (copy) => {
        console.log('Attempting to delete employee copy at path:', copy.path);
        try {
          if (!copy.path) {
            console.log('No path found for copy:', copy);
            return;
          }
          if (!fs.existsSync(copy.path)) {
            console.log('File does not exist at path:', copy.path);
            return;
          }
          await deleteEmployeeDocument(copy.path);
          console.log('Successfully deleted employee copy at path:', copy.path);
        } catch (error) {
          console.error('Error deleting employee copy:', error);
        }
      }));
    }

    // Ștergem toate documentele din baza de date
    await Document.deleteMany({ _id: { $in: documentIds } });
    console.log('Document records deleted from database');

    res.json({ 
      message: 'Documentele au fost șterse cu succes',
      deletedCount: documents.length
    });
  } catch (error) {
    console.error('Error bulk deleting documents:', error);
    res.status(500).json({ message: 'Eroare la ștergerea documentelor: ' + error.message });
  }
}; 