const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const DSSService = require('../src/services/signatures/DSSService');

async function createTestPDF() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const pdfPath = path.join(__dirname, 'test.pdf');
    const writeStream = fs.createWriteStream(pdfPath);

    doc.pipe(writeStream);
    doc.fontSize(16).text('Document pentru testare semnături multiple', 100, 100);
    doc.fontSize(12).text('Acest document va fi semnat de mai mulți utilizatori.', 100, 150);
    
    // Adăugăm spații pentru semnături
    doc.fontSize(10)
       .text('Semnătură 1: ________________', 100, 300)
       .text('Semnătură 2: ________________', 100, 400)
       .text('Semnătură 3: ________________', 100, 500);

    doc.end();

    writeStream.on('finish', () => {
      const pdfBuffer = fs.readFileSync(pdfPath);
      resolve(pdfBuffer);
    });

    writeStream.on('error', reject);
  });
}

async function testDSSService() {
  try {
    console.log('Începe testarea DSSService...');

    // Creăm documentul PDF pentru test
    const pdfBuffer = await createTestPDF();
    console.log(`PDF încărcat, dimensiune: ${pdfBuffer.length} bytes`);

    const dssService = new DSSService();

    // Definim semnatarii
    const signers = [
      {
        firstName: 'Ion',
        lastName: 'Popescu',
        identityNumber: '1234567890123',
        organization: 'Compania A',
        role: 'Director',
        city: 'București'
      },
      {
        firstName: 'Maria',
        lastName: 'Ionescu',
        identityNumber: '2345678901234',
        organization: 'Compania B',
        role: 'Manager',
        city: 'Cluj'
      },
      {
        firstName: 'George',
        lastName: 'Georgescu',
        identityNumber: '3456789012345',
        organization: 'Compania C',
        role: 'Administrator',
        city: 'Iași'
      }
    ];

    // Definim pozițiile semnăturilor
    const signaturePositions = [
      { page: 1, x: 100, y: 300, width: 190, height: 50 },
      { page: 1, x: 100, y: 400, width: 190, height: 50 },
      { page: 1, x: 100, y: 500, width: 190, height: 50 }
    ];

    let currentPdfBuffer = pdfBuffer;

    // Semnăm documentul cu fiecare semnatar
    for (let i = 0; i < signers.length; i++) {
      console.log(`\nAplicare semnătură ${i + 1}...`);
      console.log(`Semnatar: ${signers[i].firstName} ${signers[i].lastName}`);
      
      currentPdfBuffer = await dssService.signDocument(
        currentPdfBuffer,
        signers[i],
        signaturePositions[i]
      );

      // Salvăm versiunea intermediară
      const intermediatePath = path.join(__dirname, `test-signed-${i + 1}.pdf`);
      fs.writeFileSync(intermediatePath, currentPdfBuffer);
      console.log(`Document cu semnătura ${i + 1} salvat la: ${intermediatePath}`);

      // Validăm după fiecare semnătură
      console.log(`\nValidare după semnătura ${i + 1}:`);
      const validationResult = await dssService.validateSignature(currentPdfBuffer);
      
      console.log('Rezultat validare:', JSON.stringify({
        valid: validationResult.valid,
        totalSignatures: validationResult.totalSignatures,
        validSignatures: validationResult.validSignatures
      }, null, 2));

      // Verificări
      if (!validationResult.valid) {
        throw new Error(`Validarea a eșuat după semnătura ${i + 1}`);
      }
      if (validationResult.totalSignatures !== i + 1) {
        throw new Error(`Număr incorect de semnături detectate: ${validationResult.totalSignatures} (așteptat: ${i + 1})`);
      }
      if (validationResult.validSignatures !== i + 1) {
        throw new Error(`Număr incorect de semnături valide: ${validationResult.validSignatures} (așteptat: ${i + 1})`);
      }

      // Verificăm ordinea semnăturilor
      const lastSignature = validationResult.signatures[i];
      if (lastSignature.signer.identityNumber !== signers[i].identityNumber) {
        throw new Error(`CNP-ul nu corespunde pentru semnătura ${i + 1}`);
      }

      // Verificăm raportul de modificări
      if (i > 0) {
        const modifications = validationResult.modificationsReport[i - 1];
        console.log(`\nModificări între semnăturile ${i} și ${i + 1}:`, 
          JSON.stringify(modifications, null, 2));
      }
    }

    // Validare finală
    console.log('\nValidare finală a documentului:');
    const finalValidation = await dssService.validateSignature(currentPdfBuffer);
    console.log('Rezultat validare finală:', JSON.stringify(finalValidation, null, 2));

    // Salvăm documentul final
    const finalPath = path.join(__dirname, 'test-signed-final.pdf');
    fs.writeFileSync(finalPath, currentPdfBuffer);
    console.log(`\nDocument final cu toate semnăturile salvat la: ${finalPath}`);

    console.log('\nTest completat cu succes!');
  } catch (error) {
    console.error('Eroare în timpul testului:', error);
    throw error;
  }
}

// Rulăm testul
testDSSService().catch(console.error); 