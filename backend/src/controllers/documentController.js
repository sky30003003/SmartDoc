const Document = require('../models/Document');
const StorageFactory = require('../services/storage/StorageFactory');
const multer = require('multer');
const Organization = require('../models/Organization');
const path = require('path');
const { createEmployeeFolder, copyDocumentToEmployee, deleteEmployeeDocument } = require('../utils/fileUtils');
const Employee = require('../models/Employee');
const fsPromises = require('fs').promises;
const fs = require('fs');
const nodemailer = require('nodemailer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const crypto = require('crypto');
const QRCode = require('qrcode');
const PAdESService = require('../services/signatures/PAdESService');
const mongoose = require('mongoose');

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
    const documents = await Document.find({
      organizationId: req.user.organization
    }).sort({ createdAt: -1 });

    // Adăugăm informații despre progres și stare pentru fiecare document
    const documentsWithProgress = documents.map(doc => {
      const progress = doc.getSignatureProgress();
      const hasSignatures = doc.signatureProgress?.signatures?.length > 0;
      const isFullySigned = doc.isFullySigned();
      const totalSteps = doc.signatureConfig?.length || 0;
      const currentStep = doc.signatureProgress?.currentStep || 0;
      
      // Determinăm starea documentului
      let status = 'pending';
      if (isFullySigned) {
        status = 'completed';
      } else if (hasSignatures) {
        status = 'in_progress';
      }

      // Calculăm dacă documentul poate fi trimis la semnat
      const canBeSentForSignature = !hasSignatures && totalSteps > 0;

      console.log('Document state in getAllDocuments:', {
        id: doc._id,
        title: doc.title,
        status,
        hasSignatures,
        isFullySigned,
        canBeSentForSignature,
        currentStep,
        totalSteps,
        signatureCount: doc.signatureProgress?.signatures?.length
      });

      const docObject = doc.toObject();
      return {
        ...docObject,
        signatureProgress: {
          currentStep,
          totalSteps,
          signatures: doc.signatureProgress?.signatures || [],
          progress: {
            completed: progress.completed,
            total: progress.total,
            percentage: progress.percentage
          },
          status,
          canBeSentForSignature,
          isFullySigned,
          hasSignatures
        }
      };
    });

    console.log('Sending documents with states:', documentsWithProgress.map(doc => ({
      id: doc._id,
      title: doc.title,
      status: doc.signatureProgress.status,
      canBeSentForSignature: doc.signatureProgress.canBeSentForSignature,
      hasSignatures: doc.signatureProgress.hasSignatures,
      isFullySigned: doc.signatureProgress.isFullySigned
    })));

    res.json(documentsWithProgress);
  } catch (error) {
    console.error('Error fetching documents:', error);
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
        totalSteps: parsedSignatureConfig.length || 0,
        signatures: []
      };

      const document = new Document({
        title,
        description,
        originalName: file.originalname,
        path: uploadResult.path,
        fileSize: file.size,
        organizationId: req.user.organization,
        uploadedBy: req.user.userId,
        signatureConfig: parsedSignatureConfig,
        signatureProgress,
        employeeCopies: []
      });

      await document.save();

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
    // Găsim documentul
    const document = await Document.findOne({
      _id: req.params.id,
      organizationId: req.user.organization
    });

    if (!document) {
      return res.status(404).json({ message: 'Documentul nu a fost găsit' });
    }

    // Găsim organizația
    const organization = await Organization.findById(req.user.organization);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită' });
    }

    console.log('Deleting document:', {
      id: document._id,
      path: document.path,
      fileUrl: document.fileUrl
    });

    // Ștergem fișierul fizic
    try {
      if (document.path) {
        await fsPromises.unlink(document.path);
        console.log('Fișierul fizic a fost șters:', document.path);
      }
    } catch (error) {
      console.error('Eroare la ștergerea fișierului fizic:', error);
      // Continuăm cu ștergerea din DB chiar dacă fișierul fizic nu poate fi șters
    }

    // Ștergem documentul din baza de date
    await Document.deleteOne({ _id: document._id });
    console.log('Documentul a fost șters din baza de date');

    res.json({ 
      message: 'Documentul a fost șters cu succes',
      documentId: document._id
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ 
      message: 'Eroare la ștergerea documentului',
      error: error.message 
    });
  }
};

exports.downloadDocument = async (req, res) => {
  try {
    console.log('=== Download Document Debug ===');
    console.log('Document ID:', req.params.id);
    console.log('User:', {
      id: req.user.userId,
      organization: req.user.organization
    });

    const document = await Document.findOne({
      _id: req.params.id,
      organizationId: req.user.organization
    });

    console.log('Document found:', document ? {
      id: document._id,
      path: document.path,
      exists: document.path ? fs.existsSync(document.path) : false
    } : 'No document found');

    if (!document) {
      return res.status(404).json({ message: 'Documentul nu a fost găsit' });
    }

    const organization = await Organization.findById(req.user.organization);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită' });
    }

    if (!document.path) {
      console.error('Document path is missing');
      return res.status(404).json({ message: 'Calea documentului nu este setată' });
    }

    if (!fs.existsSync(document.path)) {
      console.error('File not found at path:', document.path);
      
      // Încercăm să găsim documentul în directorul de stocare
      const safeOrgName = organization.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const storageDir = path.join(__dirname, '../storage');
      const alternativePath = path.join(storageDir, safeOrgName, path.basename(document.path));
      
      console.log('Trying alternative path:', {
        originalPath: document.path,
        alternativePath,
        exists: fs.existsSync(alternativePath)
      });

      if (!fs.existsSync(alternativePath)) {
        return res.status(404).json({ message: 'Fișierul nu a fost găsit' });
      }

      // Actualizăm calea documentului în baza de date
      document.path = alternativePath;
      await document.save();
    }

    // Setăm header-urile pentru PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Trimitem fișierul
    const absolutePath = path.resolve(document.path);
    console.log('Sending file from path:', absolutePath);
    
    res.sendFile(absolutePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ message: 'Eroare la trimiterea fișierului' });
      }
    });
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Eroare la descărcarea documentului' });
  }
};

exports.sendToSign = async (req, res) => {
  try {
    console.log('=== Send to Sign Debug ===');
    console.log('User:', {
      id: req.user.userId,
      organization: req.user.organization,
      role: req.user.role
    });

    // Găsim documentul și verificăm dacă aparține organizației
    const document = await Document.findOne({
      _id: req.params.id,
      organizationId: req.user.organization
    });

    console.log('Document found:', document ? {
      id: document._id,
      signatureProgress: document.signatureProgress,
      signatureConfig: document.signatureConfig
    } : 'No');

    if (!document) {
      return res.status(404).json({ message: 'Documentul nu a fost găsit' });
    }

    // Verificăm dacă documentul are configurație pentru semnătura admin
    const adminConfig = document.signatureConfig.find(config => config.role === 'org_admin' && config.order === 1);
    console.log('Admin signature config found:', adminConfig ? 'Yes' : 'No');

    if (!adminConfig) {
      return res.status(400).json({ message: 'Documentul nu necesită semnătura administratorului' });
    }

    // Verificăm dacă documentul nu a fost deja semnat
    const hasSignatures = document.signatureProgress?.signatures?.length > 0;
    const isFullySigned = document.isFullySigned();
    console.log('Document signature state:', {
      hasSignatures,
      isFullySigned,
      signatures: document.signatureProgress?.signatures?.length
    });

    if (hasSignatures) {
      return res.status(400).json({ message: 'Documentul a fost deja semnat' });
    }

    // Găsim administratorul organizației
    console.log('Searching for admin with criteria:', {
      organization: req.user.organization,
      role: 'org_admin'
    });

    const admin = await Employee.findOne({ 
      organization: req.user.organization,
      role: 'org_admin'
    }).populate('organization');

    console.log('Admin found:', admin ? {
      id: admin._id,
      email: admin.email,
      role: admin.role
    } : 'No');

    if (!admin) {
      return res.status(404).json({ message: 'Nu s-a găsit administratorul organizației' });
    }

    // Verificăm cazul special: admin este primul în secvență și este autentificat
    const isAdminFirstSigner = adminConfig.order === 1;
    const isAdminLoggedIn = req.user.role === 'org_admin';
    
    console.log('Special case check:', {
      isAdminFirstSigner,
      isAdminLoggedIn,
      userRole: req.user.role,
      adminConfigOrder: adminConfig.order
    });

    // Dacă admin-ul este primul în secvență și este autentificat, nu mai trimitem email
    if (isAdminFirstSigner && isAdminLoggedIn) {
      return res.json({ 
        message: 'Puteți semna documentul direct din interfață',
        canSignDirectly: true,
        documentStatus: {
          canBeSentForSignature: false,
          hasSignatures,
          isFullySigned
        }
      });
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

    // Generăm link-ul unic pentru semnare
    const signLink = `${process.env.FRONTEND_URL}/sign-document/${document._id}/${admin._id}`;

    // Trimitem email-ul către admin
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"SmartDoc" <noreply@smartdoc.com>',
      to: admin.email,
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

    res.json({ 
      message: 'Documentul a fost trimis spre semnare către administrator',
      sentTo: admin.email,
      sentCount: 1,
      documentStatus: {
        canBeSentForSignature: false,
        hasSignatures,
        isFullySigned
      }
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
    // Ne asigurăm că avem structurile necesare
    const signatureProgress = document.signatureProgress || { signatures: [] };
    const signatures = signatureProgress.signatures || [];
    const signatureConfig = document.signatureConfig || [];

    console.log('Notifying next signer. Current state:', {
      totalConfig: signatureConfig.length,
      completedSignatures: signatures.length,
      currentStep: signatureProgress.currentStep
    });

    // Găsim următoarea configurație de semnătură
    const nextSignatureConfig = signatureConfig.find(config => 
      !signatures.some(sig => sig.signedBy.role === config.role)
    );

    if (!nextSignatureConfig) {
      console.log('Toate semnăturile au fost completate');
      return;
    }

    console.log('Found next signature config:', nextSignatureConfig);

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

    console.log(`Found ${nextSigners.length} next signers with role ${nextSignatureConfig.role}`);

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
    console.log('=== Verify Signature Debug ===');
    const { id, signatureId } = req.params;
    console.log('Params:', { id, signatureId });

    // Găsește documentul
    const document = await Document.findById(id);
    if (!document) {
      console.log('Document not found');
      return res.status(404).json({ message: 'Documentul nu a fost găsit' });
    }

    console.log('Document found:', {
      id: document._id,
      title: document.title,
      signatureCount: document.signatureProgress?.signatures?.length,
      signatures: JSON.stringify(document.signatureProgress?.signatures, null, 2)
    });

    // Găsește semnătura în noua structură folosind _id
    const signature = document.signatureProgress?.signatures?.find(sig => 
      sig._id.toString() === signatureId
    );
    
    console.log('Signature search result:', signature ? {
      signatureId: signature._id,
      signedBy: signature.signedBy,
      signedAt: signature.signedAt,
      fullSignature: JSON.stringify(signature, null, 2)
    } : 'Not found');
    
    if (!signature) {
      return res.status(404).json({ message: 'Semnătura nu a fost găsită' });
    }

    // Inițializăm serviciul PAdES
    console.log('Initializing PAdES service...');
    const signingService = new PAdESService({
      basePath: path.join(__dirname, '../secure_storage')
    });
    await signingService.initialize();
    console.log('PAdES service initialized');

    // Citim documentul PDF
    console.log('Reading PDF from path:', document.path);
    const pdfBuffer = await fsPromises.readFile(document.path);
    console.log('PDF loaded successfully, size:', pdfBuffer.length);

    // Verificăm semnăturile
    console.log('Starting signature verification...');
    const verificationResults = await signingService.verifySignatures(pdfBuffer);
    console.log('Raw verification results:', JSON.stringify(verificationResults, null, 2));

    // Formatăm informațiile despre semnatar
    console.log('Formatting signer information for:', signature.signedBy);
    const formattedSignedBy = {
      name: signature.signatureInfo?.signedBy?.name || 
           `${signature.signedBy.role === 'org_admin' ? 'Administrator' : 'Angajat'} - ${signature.signedBy.organization}`,
      role: signature.signedBy.role === 'org_admin' ? 'Administrator' : 'Angajat',
      organization: signature.signedBy.organization
    };

    // Dacă nu avem rezultate de verificare, folosim informațiile din baza de date
    if (!verificationResults || verificationResults.length === 0) {
      console.log('No verification results from PAdES, using database info');
      const response = {
        isValid: true, // Presupunem că e validă dacă există în baza de date
        signedBy: formattedSignedBy,
        signedAt: signature.signedAt,
        documentHash: signature.signatureInfo.documentHash,
        errors: [],
        warning: 'Semnătura există în baza de date dar nu a putut fi verificată în PDF'
      };

      console.log('Sending response:', response);
      return res.json(response);
    }

    // Găsim rezultatul pentru semnătura specificată folosind signatureId din signatureInfo
    const signatureResult = verificationResults.find(
      result => result.signatureId === signature.signatureInfo.signatureId
    );

    console.log('Signature verification result:', signatureResult);

    if (!signatureResult) {
      const response = {
        isValid: true, // Presupunem că e validă dacă există în baza de date
        signedBy: formattedSignedBy,
        signedAt: signature.signedAt,
        documentHash: signature.signatureInfo.documentHash,
        errors: [],
        warning: 'Semnătura există în baza de date dar nu a putut fi verificată în PDF'
      };

      console.log('Sending response:', response);
      return res.json(response);
    }

    const response = {
      isValid: signatureResult.isValid,
      signedBy: formattedSignedBy,
      signedAt: signature.signedAt,
      documentHash: signature.signatureInfo.documentHash,
      errors: signatureResult.errors || []
    };

    console.log('Sending response:', response);
    return res.json(response);

  } catch (error) {
    console.error('Error verifying signature:', error);
    return res.status(500).json({ message: error.message });
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
      console.log('Deleting original document:', document.path);
      try {
        if (document.path && fs.existsSync(document.path)) {
          await fsPromises.unlink(document.path);
          console.log('Original document deleted successfully');
        } else {
          console.log('Original document file not found at path:', document.path);
        }
      } catch (error) {
        console.error('Error deleting original document:', error);
        // Continue with deletion even if file removal fails
      }

      // Ștergem copiile de la angajați
      console.log('Employee copies to delete:', document.employeeCopies);
      await Promise.all(document.employeeCopies.map(async (copy) => {
        console.log('Attempting to delete employee copy at path:', copy.path);
        try {
          if (copy.path && fs.existsSync(copy.path)) {
            await deleteEmployeeDocument(copy.path);
            console.log('Successfully deleted employee copy at path:', copy.path);
          } else {
            console.log('Employee copy file not found at path:', copy.path);
          }
        } catch (error) {
          console.error('Error deleting employee copy:', error);
          // Continue with deletion even if file removal fails
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

async function handleAdminSignature(document, adminId, printOptions) {
  console.log('Handling admin signature with options:', {
    documentId: document._id,
    adminId,
    printOptions
  });

  // Găsim organizația și admin-ul
  const organization = await Organization.findById(document.organizationId);
  const admin = await Employee.findById(adminId);

  if (!organization || !admin) {
    throw new Error('Organizația sau admin-ul nu au fost găsite');
  }

  // Inițializăm serviciul de semnare cu setările din organizație
  const signingService = new PAdESService({
    basePath: process.env.STORAGE_PATH,
    validityYears: organization.certificateSettings?.validityYears || 5,
    visualSignature: printOptions.printDigitalSignature,
    includeQR: printOptions.includeQRCode
  });

  console.log('Initialized PAdES service with options:', {
    validityYears: organization.certificateSettings?.validityYears || 5,
    visualSignature: printOptions.printDigitalSignature,
    includeQR: printOptions.includeQRCode,
    rawPrintOptions: printOptions
  });

  await signingService.initialize();

  // Pregătim informațiile pentru semnătură
  const signatureTimestamp = new Date().toISOString();
  const signatureId = `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const signatureInfo = {
    signatureId,
    signerName: `${admin.firstName} ${admin.lastName} (Administrator)`,
    signerEmail: admin.email,
    organization: organization.name,
    timestamp: signatureTimestamp,
    documentHash: '',
    signatureType: 'PAdES-Basic'
  };

  // Verificăm existența documentului
  if (!document.path || !fs.existsSync(document.path)) {
    throw new Error('Documentul nu există la calea specificată');
  }

  // Citim documentul PDF
  const pdfBuffer = await fsPromises.readFile(document.path);
  console.log('Read PDF buffer:', { size: pdfBuffer.length });

  // Semnăm documentul
  const result = await signingService.signDocument(pdfBuffer, {
    id: admin._id,
    firstName: admin.firstName,
    lastName: admin.lastName,
    email: admin.email,
    organization: organization.name,
    role: 'org_admin'
  }, {
    title: document.title,
    signatureId,
    printDigitalSignature: printOptions.printDigitalSignature,
    includeQRCode: printOptions.includeQRCode
  });

  console.log('Document signed successfully:', {
    resultSize: result.pdfBytes.length,
    documentHash: result.documentHash
  });

  // Suprascrie documentul original cu versiunea semnată
  await fsPromises.writeFile(document.path, result.pdfBytes);

  // Actualizăm progresul semnăturilor
  document.signatureProgress.signatures.push({
    signatureInfo: {
      ...signatureInfo,
      documentHash: result.documentHash
    },
    signedBy: {
      id: admin._id,
      name: `${admin.firstName} ${admin.lastName}`,
      email: admin.email,
      role: admin.role,
      organization: organization.name
    },
    signedAt: signatureTimestamp
  });

  document.signatureProgress.currentStep++;

  if (document.signatureProgress.currentStep >= document.signatureProgress.totalSteps) {
    document.status = 'completed';
  } else {
    document.status = 'in_progress';
  }

  await document.save();
  return document;
}

exports.signDocumentAsAdmin = async (req, res) => {
  try {
    const { id: documentId } = req.params;
    
    console.log('=== signDocumentAsAdmin Debug ===');
    console.log('User:', {
      id: req.user.userId,
      role: req.user.role,
      organization: req.user.organization
    });
    console.log('Document ID:', documentId);

    // Verificăm dacă utilizatorul este administrator
    if (req.user.role !== 'org_admin') {
      return res.status(403).json({ 
        message: 'Doar administratorii pot semna în această etapă' 
      });
    }

    // Găsim documentul
    const document = await Document.findOne({
      _id: documentId,
      organizationId: req.user.organization
    });

    if (!document) {
      return res.status(404).json({ message: 'Documentul nu a fost găsit' });
    }

    console.log('Document found:', {
      id: document._id,
      title: document.title,
      organizationId: document.organizationId
    });

    // Găsim organizația
    const organization = await Organization.findById(req.user.organization);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită' });
    }

    // Folosim setările din organizație pentru semnătură
    const signatureSettings = {
      printDigitalSignature: organization.signatureSettings?.printSignature || false,
      includeQRCode: organization.signatureSettings?.includeQRCode || false
    };

    console.log('Using organization signature settings:', signatureSettings);

    // Procesăm semnătura administratorului
    const signedDocument = await handleAdminSignature(document, req.user.userId, signatureSettings);

    // Calculăm progresul semnăturilor
    const signatureProgress = signedDocument.getSignatureProgress();
    const isFullySigned = signedDocument.isFullySigned();
    const hasSignatures = signedDocument.signatureProgress?.signatures?.length > 0;
    
    // Determinăm starea documentului
    let status = 'pending';
    if (isFullySigned) {
      status = 'completed';
    } else if (hasSignatures) {
      status = 'in_progress';
    }

    console.log('Document state after signing:', {
      signatureProgress,
      isFullySigned,
      hasSignatures,
      status
    });

    res.json({
      message: 'Document semnat cu succes',
      document: {
        ...signedDocument.toObject(),
        signatureProgress: {
          currentStep: signedDocument.signatureProgress.currentStep,
          totalSteps: signedDocument.signatureProgress.totalSteps,
          signatures: signedDocument.signatureProgress.signatures,
          progress: {
            completed: signatureProgress.completed,
            total: signatureProgress.total,
            percentage: signatureProgress.percentage
          },
          status,
          canBeSentForSignature: !hasSignatures && signedDocument.signatureConfig.length > 0,
          isFullySigned
        }
      }
    });

  } catch (error) {
    console.error('Error in signDocumentAsAdmin:', error);
    res.status(500).json({ 
      message: 'Eroare la semnarea documentului',
      error: error.message 
    });
  }
};

exports.resetAndDeleteDocument = async (req, res) => {
  try {
    const { id: documentId } = req.params;

    // Găsim documentul
    const document = await Document.findOne({
      _id: documentId,
      organizationId: req.user.organization
    });

    if (!document) {
      return res.status(404).json({ message: 'Documentul nu a fost găsit' });
    }

    // Găsim organizația
    const organization = await Organization.findById(req.user.organization);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită' });
    }

    // Ștergem fișierul fizic
    try {
      await fsPromises.unlink(document.path);
      console.log('Fișierul fizic a fost șters:', document.path);
    } catch (error) {
      console.error('Eroare la ștergerea fișierului fizic:', error);
    }

    // Ștergem documentul din baza de date
    await Document.deleteOne({ _id: documentId });
    console.log('Documentul a fost șters din baza de date');

    res.json({ 
      message: 'Documentul a fost șters cu succes',
      documentId
    });

  } catch (error) {
    console.error('Error in resetAndDeleteDocument:', error);
    res.status(500).json({ 
      message: 'Eroare la ștergerea documentului',
      error: error.message 
    });
  }
}; 