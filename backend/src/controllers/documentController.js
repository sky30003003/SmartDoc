const Document = require('../models/Document');
const StorageFactory = require('../services/storage/StorageFactory');
const multer = require('multer');
const Organization = require('../models/Organization');
const path = require('path');
const { createEmployeeFolder, copyDocumentToEmployee, deleteEmployeeDocument } = require('../utils/fileUtils');
const Employee = require('../models/Employee');
const fs = require('fs');
const nodemailer = require('nodemailer');
const DigitalSignatureService = require('../services/cryptography/DigitalSignatureService');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const crypto = require('crypto');
const QRCode = require('qrcode');

const storage = StorageFactory.getStorageService();
const upload = multer({ storage: multer.memoryStorage() }).single('file');

exports.getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ organization: req.user.organization })
      .select('title description originalName fileType fileUrl fileSize uploadedAt organization employeeCopies')
      .sort({ uploadedAt: -1 });

    // Obținem toți angajații organizației
    const employees = await Employee.find({ organization: req.user.organization })
      .select('_id firstName lastName');

    // Creăm un map pentru căutare rapidă
    const employeeMap = employees.reduce((map, emp) => {
      map[emp._id.toString()] = `${emp.firstName} ${emp.lastName}`;
      return map;
    }, {});

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

    res.json(enrichedDocuments);
  } catch (error) {
    console.error('Error getting documents:', error);
    res.status(500).json({ message: 'Eroare la obținerea documentelor' });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) return res.status(400).json({ message: err.message });
      if (!req.file) return res.status(400).json({ message: 'Niciun fișier încărcat' });

      // Validăm că fișierul este PDF
      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({ message: 'Sunt acceptate doar fișiere PDF' });
      }

      const { title, description } = req.body;
      const file = req.file;

      const organization = await Organization.findById(req.user.organization);
      if (!organization) {
        return res.status(404).json({ message: 'Organizația nu a fost găsită' });
      }

      try {
        const uploadResult = await storage.uploadFile(file, req.user.organization, organization.name);
        console.log('Upload result:', uploadResult);

        if (!uploadResult.path) {
          throw new Error('Upload result missing file path');
        }

        const document = new Document({
          title,
          description,
          originalName: file.originalname,
          fileUrl: uploadResult.url,
          fileType: file.mimetype,
          fileSize: file.size,
          organization: req.user.organization,
          uploadedBy: req.user.userId
        });
        await document.save();

        const employees = await Employee.find({ organization: req.user.organization });
        
        console.log('Found employees:', employees);
        console.log('Source file path:', uploadResult.path);
        
        const employeeCopies = await Promise.all(employees.map(async (employee) => {
          const employeePath = createEmployeeFolder(
            organization.name, 
            `${employee.firstName}_${employee.lastName}`
          );
          
          console.log('Employee folder:', employeePath);
          
          const documentPath = await copyDocumentToEmployee(
            uploadResult.path,
            employeePath,
            file.originalname
          );
          
          return {
            employee: employee._id,
            path: documentPath
          };
        }));

        document.employeeCopies = employeeCopies;
        await document.save();

        res.status(201).json(document);
      } catch (error) {
        if (error.message === 'Un fișier cu acest nume există deja') {
          return res.status(400).json({ message: error.message });
        }
        throw error;
      }
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Eroare la încărcarea documentului' });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      organization: req.user.organization
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
      organization: req.user.organization
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
      organization: req.user.organization
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
    console.log('Starting document signing process:', {
      documentId: req.params.id,
      employeeId: req.params.employeeId
    });

    // Găsim documentul și verificăm dacă aparține organizației
    const document = await Document.findOne({
      _id: req.params.id,
      'employeeCopies.employee': req.params.employeeId
    }).populate('organization');

    if (!document) {
      console.log('Document not found');
      return res.status(404).json({ message: 'Documentul nu a fost găsit' });
    }

    console.log('Document found:', {
      id: document._id,
      title: document.title,
      signatureSettings: document.organization.signatureSettings
    });

    // Verificăm dacă angajatul are dreptul să semneze
    const employeeCopy = document.employeeCopies.find(
      copy => copy.employee.toString() === req.params.employeeId
    );

    if (!employeeCopy) {
      console.log('Employee copy not found');
      return res.status(403).json({ message: 'Nu aveți dreptul să semnați acest document' });
    }

    console.log('Employee copy found:', {
      status: employeeCopy.status,
      path: employeeCopy.path
    });

    if (employeeCopy.status === 'signed') {
      console.log('Document already signed');
      return res.status(400).json({ message: 'Documentul a fost deja semnat' });
    }

    // Găsim angajatul
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) {
      console.log('Employee not found');
      return res.status(404).json({ message: 'Angajatul nu a fost găsit' });
    }

    console.log('Employee found:', {
      id: employee._id,
      name: `${employee.firstName} ${employee.lastName}`
    });

    // Găsim organizația
    const organization = document.organization;
    if (!organization) {
      console.log('Organization not found');
      return res.status(404).json({ message: 'Organizația nu a fost găsită' });
    }

    console.log('Organization signature settings:', {
      printSignature: organization.signatureSettings?.printSignature,
      includeQRCode: organization.signatureSettings?.includeQRCode
    });

    // Încărcăm PDF-ul original
    console.log('Loading PDF from path:', employeeCopy.path);
    const pdfBytes = await fs.promises.readFile(employeeCopy.path);
    console.log('PDF loaded successfully');

    // Generăm ID-ul semnăturii înainte de a-l folosi în QR code
    const signatureId = crypto.randomBytes(8).toString('hex');
    console.log('Generated signature ID:', signatureId);

    // Încărcăm PDF-ul și pregătim pentru semnare
    const pdfDoc = await PDFDocument.load(pdfBytes);
    console.log('PDF document loaded into PDFDocument');
    
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    // Adăugăm watermark doar dacă printSignature este activat
    if (organization.signatureSettings?.printSignature) {
      console.log('Adding watermark - printSignature is enabled');
      
      try {
        // Folosim Helvetica în loc de TimesRoman pentru suport Unicode
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        console.log('Font embedded successfully');

        // Pregătim textul pentru watermark folosind diacritice ASCII
        const watermarkText = [
          'Semnat digital de:',
          `${employee.firstName} ${employee.lastName}`,
          `CNP: ${employee.cnp}`,
          `Data: ${new Date().toLocaleDateString('en-US')}`,
          `ID Semnatura: ${signatureId}`
        ];

        // Calculăm dimensiunile pentru watermark și QR code
        const margin = 50;
        const fontSize = 10;
        const lineHeight = fontSize * 1.2;
        const textWidth = Math.max(...watermarkText.map(line => font.widthOfTextAtSize(line, fontSize)));
        const textHeight = lineHeight * watermarkText.length;
        const qrCodeSize = 100;
        
        // Calculăm poziția pentru watermark și QR code
        let x = width - textWidth - margin;
        let y = margin;

        // Dacă includem QR code, ajustăm poziția watermark-ului
        if (organization.signatureSettings?.includeQRCode) {
          console.log('QR code is enabled - adjusting watermark position');
          y = margin + qrCodeSize + 30; // Adăugăm spațiu pentru QR code și text
        }

        // Desenăm watermark-ul
        watermarkText.forEach((line, index) => {
          lastPage.drawText(line, {
            x: x,
            y: y + (watermarkText.length - 1 - index) * lineHeight,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
            opacity: 0.8
          });
        });

        // Adăugăm QR code doar dacă este activat în setări
        if (organization.signatureSettings?.includeQRCode) {
          console.log('Adding QR code to document - includeQRCode is enabled');
          
          // Generăm QR code-ul folosind FRONTEND_URL din env
          const verificationUrl = `${process.env.FRONTEND_URL}/verify/${document._id}/${signatureId}`;
          console.log('QR code verification URL:', verificationUrl);
          
          const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 300
          });
          const qrImageBytes = qrCodeDataUrl.split(',')[1];
          const qrImage = await pdfDoc.embedPng(Buffer.from(qrImageBytes, 'base64'));

          // Desenăm QR code-ul cu dimensiuni mai mari pentru scanare mai ușoară
          const qrCodeX = width - qrCodeSize - margin;
          const qrCodeY = margin;

          lastPage.drawImage(qrImage, {
            x: qrCodeX,
            y: qrCodeY,
            width: qrCodeSize,
            height: qrCodeSize
          });

          // Adăugăm textul sub QR code folosind Helvetica
          const verifyText = 'Scaneaza pentru verificare';
          const verifyTextWidth = font.widthOfTextAtSize(verifyText, fontSize);
          lastPage.drawText(verifyText, {
            x: qrCodeX + (qrCodeSize - verifyTextWidth) / 2,
            y: qrCodeY - 15,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
            opacity: 0.8
          });
        } else {
          console.log('QR code is disabled - skipping QR code generation');
        }

        // Salvăm documentul modificat
        console.log('Saving modified PDF');
        const modifiedPdfBytes = await pdfDoc.save();
        await fs.promises.writeFile(employeeCopy.path, modifiedPdfBytes);
        console.log('Modified PDF saved successfully');

        // Verificăm dacă angajatul are deja o pereche de chei
        if (!employee.digitalSignature?.publicKey) {
          console.log('Generating new key pair for employee');
          const keypair = DigitalSignatureService.generateKeyPair();
          const certificate = DigitalSignatureService.generateCertificate(keypair, {
            firstName: employee.firstName,
            lastName: employee.lastName,
            organization: organization.name
          });

          // Salvăm cheia publică și certificatul în baza de date
          employee.digitalSignature = {
            publicKey: keypair.publicKey,
            certificate: certificate,
            createdAt: new Date()
          };
          await employee.save();

          // Salvăm cheia privată într-un fișier securizat
          const privateKeyPath = path.join(
            __dirname,
            '../secure_storage',
            `${employee._id}_private_key.pem`
          );
          await fs.promises.mkdir(path.dirname(privateKeyPath), { recursive: true });
          await fs.promises.writeFile(privateKeyPath, keypair.privateKey, 'utf8');
        }

        // Calculăm hash-ul documentului modificat
        console.log('Calculating document hash');
        const documentHash = DigitalSignatureService.calculateDocumentHash(modifiedPdfBytes);
        console.log('Document hash calculated');

        // Citim cheia privată
        const privateKeyPath = path.join(
          __dirname,
          '../secure_storage',
          `${employee._id}_private_key.pem`
        );
        console.log('Reading private key from:', privateKeyPath);
        const privateKey = await fs.promises.readFile(privateKeyPath, 'utf8');
        console.log('Private key read successfully');

        // Semnăm documentul
        console.log('Signing document');
        const signature = DigitalSignatureService.signDocument(documentHash, privateKey);
        console.log('Document signed successfully');

        // Actualizăm documentul cu informațiile semnăturii
        const result = await Document.findOneAndUpdate(
          { 
            _id: document._id,
            'employeeCopies.employee': req.params.employeeId 
          },
          { 
            $set: { 
              'employeeCopies.$.status': 'signed',
              'employeeCopies.$.signedAt': new Date(),
              'employeeCopies.$.documentHash': documentHash,
              'employeeCopies.$.digitalSignature': signature,
              'employeeCopies.$.publicKey': employee.digitalSignature.publicKey,
              'employeeCopies.$.signatureTimestamp': new Date(),
              'employeeCopies.$.signatureId': signatureId
            }
          },
          { new: true }
        );

        if (!result) {
          throw new Error('Nu s-a putut actualiza statusul documentului');
        }

        // Verificăm semnătura pentru a ne asigura că totul este în regulă
        const isValid = DigitalSignatureService.verifySignature(
          documentHash,
          signature,
          employee.digitalSignature.publicKey
        );

        if (!isValid) {
          throw new Error('Verificarea semnăturii a eșuat');
        }

        res.json({ 
          message: 'Document semnat cu succes',
          status: 'signed',
          signedAt: new Date(),
          signatureInfo: {
            documentHash,
            timestamp: new Date(),
            signedBy: `${employee.firstName} ${employee.lastName}`,
            signatureId
          }
        });
      } catch (error) {
        console.error('Error in PDF processing:', error);
        throw error;
      }
    } else {
      console.log('Skipping watermark - printSignature is disabled');
    }

  } catch (error) {
    console.error('Error signing document:', error);
    res.status(500).json({ 
      message: 'Eroare la semnarea documentului',
      error: error.message 
    });
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
    const { id: documentId, signatureId } = req.params;
    console.log('Starting signature verification:', { documentId, signatureId });

    // Găsim documentul care conține semnătura specificată
    const document = await Document.findOne({
      _id: documentId,
      'employeeCopies.signatureId': signatureId
    });

    if (!document) {
      console.log('Document not found:', { documentId, signatureId });
      return res.status(404).json({ 
        isValid: false,
        error: 'Documentul nu a fost găsit'
      });
    }

    console.log('Document found:', {
      id: document._id,
      title: document.title
    });

    // Găsim copia specifică cu signatureId-ul dat
    const employeeCopy = document.employeeCopies.find(
      copy => copy.signatureId === signatureId
    );

    if (!employeeCopy) {
      console.log('Employee copy not found for signature:', signatureId);
      return res.status(404).json({ 
        isValid: false,
        error: 'Semnătura nu a fost găsită'
      });
    }

    console.log('Employee copy found:', {
      employeeId: employeeCopy.employee,
      status: employeeCopy.status,
      signedAt: employeeCopy.signedAt
    });

    if (employeeCopy.status !== 'signed') {
      console.log('Document is not signed:', { status: employeeCopy.status });
      return res.status(400).json({ 
        isValid: false,
        error: 'Documentul nu este semnat'
      });
    }

    // Verificăm dacă avem toate informațiile necesare
    if (!employeeCopy.documentHash || !employeeCopy.digitalSignature || !employeeCopy.publicKey) {
      console.log('Missing required signature information:', {
        hasHash: !!employeeCopy.documentHash,
        hasSignature: !!employeeCopy.digitalSignature,
        hasPublicKey: !!employeeCopy.publicKey
      });
      return res.status(400).json({ 
        isValid: false,
        error: 'Lipsesc informații necesare pentru verificarea semnăturii'
      });
    }

    // Recalculăm hash-ul documentului pentru verificare
    console.log('Reading document from path:', employeeCopy.path);
    const documentBuffer = await fs.promises.readFile(employeeCopy.path);
    const currentHash = DigitalSignatureService.calculateDocumentHash(documentBuffer);
    console.log('Document hash calculated:', { 
      stored: employeeCopy.documentHash,
      current: currentHash
    });

    // Verificăm dacă hash-ul documentului s-a schimbat
    if (currentHash !== employeeCopy.documentHash) {
      console.log('Document hash mismatch');
      return res.status(400).json({ 
        isValid: false,
        error: 'Documentul a fost modificat după semnare'
      });
    }

    // Verificăm semnătura digitală
    console.log('Verifying digital signature');
    const isValid = DigitalSignatureService.verifySignature(
      employeeCopy.documentHash,
      employeeCopy.digitalSignature,
      employeeCopy.publicKey
    );
    console.log('Signature verification result:', { isValid });

    if (!isValid) {
      return res.status(400).json({ 
        isValid: false,
        error: 'Semnătura digitală nu este validă'
      });
    }

    // Returnăm rezultatul verificării
    res.json({
      isValid: true,
      message: 'Semnătura digitală este validă',
      details: {
        documentHash: employeeCopy.documentHash,
        signedAt: employeeCopy.signedAt,
        signatureTimestamp: employeeCopy.signatureTimestamp,
        signedBy: `${employeeCopy.employee.firstName} ${employeeCopy.employee.lastName}`
      }
    });
  } catch (error) {
    console.error('Error verifying signature:', error);
    res.status(500).json({ 
      isValid: false,
      error: 'Eroare la verificarea semnăturii: ' + error.message
    });
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
      organization: req.user.organization
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