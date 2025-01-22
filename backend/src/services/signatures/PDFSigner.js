const { SignPdf } = require('@signpdf/signpdf');
const { P12Signer } = require('@signpdf/signer-p12');
const fs = require('fs').promises;
const { PDFDocument, PDFName, PDFString, PDFArray, PDFNumber, PDFHexString } = require('pdf-lib');
const crypto = require('crypto');
const forge = require('node-forge');

class PDFSigner {
  constructor(options = {}) {
    this.options = options;
    this.signPdf = new SignPdf();
  }

  async sign(pdfBuffer, signatureInfo) {
    try {
      // Generăm certificatul și cheia privată
      const { p12Buffer, certificate } = await this._generateP12Certificate(signatureInfo);
      
      // Adăugăm placeholder pentru semnătură
      const pdfWithPlaceholder = await this._addSignaturePlaceholder(pdfBuffer, signatureInfo, certificate);
      
      console.log('PDF with placeholder ready for signing:', pdfWithPlaceholder);
      console.log('PDF with placeholder size:', pdfWithPlaceholder.length);
      console.log('PDF with placeholder contains ByteRange:', pdfWithPlaceholder.toString('utf8').includes('/ByteRange'));
      console.log('PDF with placeholder contains Contents:', pdfWithPlaceholder.toString('utf8').includes('/Contents'));
      
      // Creăm semnătarul P12
      const signer = new P12Signer(p12Buffer, {
        passphrase: 'smartdoc',
        asn1StrictParsing: false
      });
      
      // Semnăm PDF-ul
      const signedPdf = await this.signPdf.sign(pdfWithPlaceholder, signer);
      
      return signedPdf;
    } catch (error) {
      console.error('Error signing PDF:', error);
      throw error;
    }
  }

  async _generateP12Certificate(signatureInfo) {
    try {
      console.log('Generating certificate for:', signatureInfo);
      
      // Generăm o pereche de chei RSA
      const keys = forge.pki.rsa.generateKeyPair(2048);
      
      // Creăm un certificat
      const cert = forge.pki.createCertificate();
      cert.publicKey = keys.publicKey;
      cert.serialNumber = '01';
      
      // Setăm perioada de valabilitate pentru 10 ani
      const now = new Date();
      cert.validity.notBefore = now;
      const expiry = new Date(now);
      expiry.setFullYear(now.getFullYear() + 10); // Valabil 10 ani
      cert.validity.notAfter = expiry;

      console.log('Certificate validity:', {
        notBefore: cert.validity.notBefore,
        notAfter: cert.validity.notAfter
      });

      const attrs = [{
        name: 'commonName',
        value: `${signatureInfo.firstName} ${signatureInfo.lastName}`
      }, {
        name: 'countryName',
        value: 'RO'
      }, {
        shortName: 'ST',
        value: 'Romania'
      }, {
        name: 'localityName',
        value: 'Bucharest'
      }, {
        name: 'organizationName',
        value: signatureInfo.organization
      }, {
        shortName: 'OU',
        value: 'Digital Signatures'
      }];

      cert.setSubject(attrs);
      cert.setIssuer(attrs);
      
      // Adăugăm extensii pentru semnături digitale
      cert.setExtensions([{
        name: 'basicConstraints',
        cA: true
      }, {
        name: 'keyUsage',
        digitalSignature: true,
        keyEncipherment: true,
        keyCertSign: true
      }, {
        name: 'extKeyUsage',
        serverAuth: true,
        clientAuth: true,
        codeSigning: true,
        emailProtection: true,
        timeStamping: true
      }, {
        name: 'subjectKeyIdentifier'
      }]);
      
      // Semnăm certificatul
      cert.sign(keys.privateKey, forge.md.sha256.create());

      console.log('Certificate generated successfully');

      // Creăm PKCS#12
      const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
        keys.privateKey,
        [cert],
        'smartdoc',
        { algorithm: '3des' }
      );

      const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
      const p12Buffer = Buffer.from(p12Der, 'binary');

      console.log('P12 certificate created successfully');

      return { p12Buffer, certificate: cert };
    } catch (error) {
      console.error('Error generating certificate:', error);
      throw error;
    }
  }

  async _addSignaturePlaceholder(pdfBuffer, signatureInfo, certificate) {
    try {
      console.log('Adding signature placeholder');
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      
      // Definim dimensiunea exactă pentru Contents
      const SIGNATURE_LENGTH = 8192;
      const contentsString = Buffer.alloc(SIGNATURE_LENGTH).fill(0).toString('hex').toUpperCase();
      
      // Creăm ByteRange ca array PDF nativ
      const byteRangePlaceholder = PDFArray.withContext(pdfDoc.context);
      byteRangePlaceholder.push(PDFNumber.of(0));
      byteRangePlaceholder.push(PDFString.of('**********'));
      byteRangePlaceholder.push(PDFString.of('**********'));
      byteRangePlaceholder.push(PDFString.of('**********'));

      // Construim dicționarul de semnătură folosind obiecte PDF native
      const signatureDict = pdfDoc.context.obj({
        Type: PDFName.of('Sig'),
        Filter: PDFName.of('Adobe.PPKLite'),
        SubFilter: PDFName.of('adbe.pkcs7.detached'),
        Name: PDFString.of(`${signatureInfo.firstName} ${signatureInfo.lastName}`),
        Location: PDFString.of(signatureInfo.organization),
        Reason: PDFString.of('Document semnat digital'),
        SigningTime: PDFString.of(new Date().toISOString()),
        ByteRange: byteRangePlaceholder,
        Contents: PDFHexString.of(contentsString)
      });

      if (certificate) {
        signatureDict.set(PDFName.of('Cert'), PDFString.of(forge.pki.certificateToPem(certificate)));
      }

      // Adăugăm în AcroForm
      if (!pdfDoc.catalog.has(PDFName.of('AcroForm'))) {
        pdfDoc.catalog.set(PDFName.of('AcroForm'), pdfDoc.context.obj({
          SigFlags: 3,
          Fields: []
        }));
      }

      // Adăugăm un câmp de semnătură invizibil
      const widgetDict = pdfDoc.context.obj({
        Type: PDFName.of('Annot'),
        Subtype: PDFName.of('Widget'),
        FT: PDFName.of('Sig'),
        Rect: [0, 0, 0, 0],
        V: signatureDict,
        F: 4,
        P: pdfDoc.getPages()[0].ref,
        T: PDFString.of('Signature1'),
      });

      const form = pdfDoc.catalog.get(PDFName.of('AcroForm'));
      if (!form.get(PDFName.of('Fields'))) {
        form.set(PDFName.of('Fields'), pdfDoc.context.obj([]));
      }
      const fields = form.get(PDFName.of('Fields'));
      fields.push(widgetDict);

      // Adăugăm în catalog
      if (!pdfDoc.catalog.has(PDFName.of('Perms'))) {
        pdfDoc.catalog.set(PDFName.of('Perms'), pdfDoc.context.obj({}));
      }
      const perms = pdfDoc.catalog.get(PDFName.of('Perms'));
      perms.set(PDFName.of('DocMDP'), signatureDict);

      console.log('Signature placeholder added successfully');
      
      // Salvăm PDF-ul cu opțiuni specifice pentru a păstra structura
      const pdfBytes = await pdfDoc.save({ 
        useObjectStreams: false,
        addDefaultPage: false,
        objectsPerTick: 50,
        updateFieldAppearances: false
      });
      
      // Verificări pentru ByteRange și Contents în PDF-ul final
      const pdfString = pdfBytes.toString('utf8');
      
      // Verificăm prezența și formatul exact
      const byteRangePresent = pdfString.includes('/ByteRange');
      const contentsPresent = pdfString.includes('/Contents');
      
      console.log('ByteRange present:', byteRangePresent);
      console.log('Contents present:', contentsPresent);
      
      if (!byteRangePresent || !contentsPresent) {
        console.error('ByteRange or Contents missing in final PDF');
        throw new Error('Failed to add signature placeholders correctly');
      }
      
      // Salvăm PDF-ul intermediar pentru debug
      await fs.writeFile('debug_pdf.pdf', pdfBytes);
      console.log('Debug PDF saved');
      
      return pdfBytes;
    } catch (error) {
      console.error('Error adding signature placeholder:', error);
      throw error;
    }
  }
}

module.exports = PDFSigner; 