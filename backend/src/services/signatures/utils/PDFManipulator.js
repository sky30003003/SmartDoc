const { PDFDocument, rgb, StandardFonts, PDFName, PDFDict, PDFString } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs').promises;

// Opțiuni consistente pentru încărcarea și salvarea PDF-urilor
const PDF_LOAD_OPTIONS = {
  updateMetadata: false,
  ignoreEncryption: true
};

const PDF_SAVE_OPTIONS = {
  useObjectStreams: false,
  addDefaultPage: false,
  updateMetadata: false
};

/**
 * Clasa pentru manipularea documentelor PDF
 * Oferă funcționalități pentru adăugarea semnăturilor vizuale și metadatelor în documente PDF
 */
class PDFManipulator {
  /**
   * Încarcă un document PDF din buffer sau fișier
   * @param {Buffer|string} source - Buffer-ul sau calea către documentul PDF
   * @returns {Promise<PDFDocument>} Documentul PDF încărcat
   */
  async loadPDF(source) {
    try {
      let pdfBytes;
      if (Buffer.isBuffer(source)) {
        pdfBytes = source;
      } else {
        pdfBytes = await fs.readFile(source);
      }
      return await PDFDocument.load(pdfBytes, PDF_LOAD_OPTIONS);
    } catch (error) {
      throw new Error(`Eroare la încărcarea PDF-ului: ${error.message}`);
    }
  }

  /**
   * Adaugă o semnătură vizuală la document
   * @param {PDFDocument} pdfDoc - Documentul PDF
   * @param {Object} signatureInfo - Informații despre semnătură
   * @param {Object} position - Poziția semnăturii
   * @returns {Promise<Object>} Dimensiunile și poziția semnăturii
   */
  async addVisualSignature(pdfDoc, signatureInfo, position) {
    try {
      // Validăm parametrii de intrare
      if (!pdfDoc) throw new Error('Document PDF invalid');
      if (!signatureInfo) throw new Error('Informații semnătură invalide');
      
      console.log('=== PDFManipulator Debug ===');
      console.log('Raw signature info received:', signatureInfo);
      console.log('includeQR value:', signatureInfo.includeQR);
      console.log('includeQR type:', typeof signatureInfo.includeQR);
      console.log('includeQR strict check:', signatureInfo.includeQR === true);
      
      const pages = pdfDoc.getPages();
      const targetPage = position.page >= 0 && position.page < pages.length 
        ? pages[position.page] 
        : pages[pages.length - 1];

      const { width, height } = targetPage.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Normalizăm informațiile semnăturii pentru a evita undefined
      const normalizedSignatureInfo = {
        signerName: signatureInfo.signerName || 'Semnatar necunoscut',
        signerEmail: signatureInfo.signerEmail || 'Email necunoscut',
        organization: signatureInfo.organization || 'Organizație necunoscută',
        signedAt: signatureInfo.signedAt || new Date().toISOString(),
        signatureId: signatureInfo.signatureId || 'ID necunoscut',
        documentHash: signatureInfo.documentHash || '',
        signerRole: signatureInfo.signerRole || 'employee',
        includeQR: signatureInfo.includeQR // Păstrăm valoarea exactă
      };

      console.log('=== After Normalization ===');
      console.log('Normalized includeQR value:', normalizedSignatureInfo.includeQR);
      console.log('Normalized includeQR type:', typeof normalizedSignatureInfo.includeQR);
      console.log('Normalized includeQR strict check:', normalizedSignatureInfo.includeQR === true);

      // Calculăm dimensiunile pentru semnătura vizuală folosind rolul semnatorului
      const signatureBox = this._calculateSignatureBox(
        width,
        height,
        position,
        normalizedSignatureInfo.includeQR === true, // Verificare strictă pentru dimensiuni
        normalizedSignatureInfo.signerRole
      );

      console.log('=== Before QR Code Check ===');
      console.log('Final includeQR check value:', signatureInfo.includeQR);
      console.log('Final includeQR check type:', typeof signatureInfo.includeQR);
      console.log('Final includeQR strict comparison:', signatureInfo.includeQR === true);

      // Adăugăm fundalul și bordul semnăturii
      this._drawSignatureBackground(targetPage, signatureBox);

      // Adăugăm textul semnăturii
      await this._addSignatureText(
        targetPage,
        font,
        signatureBox,
        normalizedSignatureInfo
      );

      // Verificăm strict dacă includeQR este true
      if (signatureInfo.includeQR === true) {
        console.log('QR code check passed, adding QR code to signature');
        await this._addQRCode(
          pdfDoc,
          targetPage,
          signatureBox,
          normalizedSignatureInfo
        );
      } else {
        console.log('QR code check failed, skipping QR code. Value:', signatureInfo.includeQR);
      }

      return signatureBox;
    } catch (error) {
      console.error('Error adding visual signature:', error);
      throw new Error(`Eroare la adăugarea semnăturii vizuale: ${error.message}`);
    }
  }

  _calculateSignatureBox(pageWidth, pageHeight, position, includeQR, signerRole = 'employee') {
    // Validăm parametrii de intrare
    if (!pageWidth || !pageHeight) {
      throw new Error('Dimensiunile paginii sunt invalide');
    }

    const margin = 20;
    // Ajustăm lățimea semnăturii în funcție de prezența QR code-ului
    const boxWidth = includeQR === true ? 300 : 200;
    const boxHeight = 100;
    
    // Poziționăm ștampila la marginea din stânga
    const x = margin;
    const y = Math.max(margin, Math.min(margin, pageHeight - boxHeight - margin));

    console.log('Calculated signature box with dimensions:', {
      x,
      y,
      width: boxWidth,
      height: boxHeight,
      margin,
      includeQR,
      signerRole
    });

    return {
      x,
      y,
      width: boxWidth,
      height: boxHeight,
      margin
    };
  }

  _drawSignatureBackground(page, box) {
    // Fundal alb semi-transparent
    page.drawRectangle({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      color: rgb(1, 1, 1),
      opacity: 0.1
    });

    // Border albastru
    page.drawRectangle({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      borderColor: rgb(0.1, 0.4, 0.8),
      borderWidth: 1,
      opacity: 0.8
    });
  }

  async _addSignatureText(page, font, box, signatureInfo) {
    const fontSize = 8;
    const lineHeight = fontSize * 1.5;
    let currentY = box.y + box.height - box.margin;

    // Convertim textele cu diacritice la versiunea fără diacritice
    const removeDiacritics = (str) => {
      if (!str) return '';
      return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[ăâ]/g, 'a')
        .replace(/[îí]/g, 'i')
        .replace(/[șş]/g, 's')
        .replace(/[țţ]/g, 't')
        .replace(/[Ăâ]/g, 'A')
        .replace(/[Îí]/g, 'I')
        .replace(/[Șş]/g, 'S')
        .replace(/[Țţ]/g, 'T');
    };

    // Construim textele cu verificări pentru undefined
    const signerName = signatureInfo.signerName || 'Semnatar necunoscut';
    const signerEmail = signatureInfo.signerEmail || 'Email necunoscut';
    const organization = signatureInfo.organization || 'Organizație necunoscută';
    const signedAt = signatureInfo.signedAt ? new Date(signatureInfo.signedAt).toLocaleString('en-US') : 'Data necunoscută';
    const signatureId = signatureInfo.signatureId || 'ID necunoscut';

    const textLines = [
      'Semnat digital de:',
      removeDiacritics(signerName),
      `Email: ${signerEmail}`,
      `Organizatie: ${removeDiacritics(organization)}`,
      `Data: ${signedAt}`,
      `ID Semnatura: ${signatureId}`
    ];

    textLines.forEach((line) => {
      page.drawText(line, {
        x: box.x,
        y: currentY,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
        opacity: 0.8
      });
      currentY -= lineHeight;
    });
  }

  async _addQRCode(pdfDoc, page, box, signatureInfo) {
    try {
      if (!process.env.FRONTEND_URL) {
        console.warn('FRONTEND_URL nu este setat. Se folosește URL-ul implicit pentru verificare.');
      }

      const qrSize = 80;
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const verificationUrl = `${baseUrl}/verify/${signatureInfo.documentHash || ''}/${signatureInfo.signatureId || ''}`;
      
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: qrSize
      });

      const qrImageBytes = qrDataUrl.split(',')[1];
      const qrImage = await pdfDoc.embedPng(Buffer.from(qrImageBytes, 'base64'));

      const qrX = box.x + box.width - qrSize - box.margin;
      const qrY = box.y + (box.height - qrSize) / 2;

      page.drawImage(qrImage, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize
      });
    } catch (error) {
      console.error('Error adding QR code:', error);
      throw new Error(`Eroare la adăugarea codului QR: ${error.message}`);
    }
  }

  /**
   * Adaugă metadata la un document PDF
   * @param {PDFDocument} pdfDoc - Documentul PDF
   * @param {Object} metadata - Metadata de adăugat
   */
  async addMetadata(pdfDoc, metadata) {
    try {
      // Creăm un nou dicționar pentru informații
      const info = pdfDoc.context.obj({});

      // Adăugăm câmpurile standard
      if (metadata.title) info.set(PDFName.of('Title'), PDFString.of(metadata.title));
      if (metadata.author) info.set(PDFName.of('Author'), PDFString.of(metadata.author));
      if (metadata.subject) info.set(PDFName.of('Subject'), PDFString.of(metadata.subject));
      if (metadata.keywords) {
        // Ne asigurăm că keywords este array și îl convertim în string corect formatat
        const keywordsArray = Array.isArray(metadata.keywords) ? metadata.keywords : [metadata.keywords];
        info.set(PDFName.of('Keywords'), PDFString.of(keywordsArray.join(' ')));
      }
      if (metadata.creator) info.set(PDFName.of('Creator'), PDFString.of(metadata.creator));
      if (metadata.producer) info.set(PDFName.of('Producer'), PDFString.of(metadata.producer));

      // Adăugăm informațiile despre semnături
      if (metadata.signatures && metadata.signatures.length > 0) {
        const signaturesStr = JSON.stringify(metadata.signatures);
        info.set(PDFName.of('SignaturesInfo'), PDFString.of(signaturesStr));
      }

      // Setăm dicționarul de informații în catalog
      pdfDoc.catalog.set(PDFName.of('Info'), info);
    } catch (error) {
      console.error('Error adding metadata:', error);
      throw new Error(`Eroare la adăugarea metadatelor: ${error.message}`);
    }
  }

  /**
   * Extrage metadata dintr-un document PDF
   * @param {PDFDocument} pdfDoc - Documentul PDF
   * @returns {Promise<Object>} Metadata extrasă
   */
  async extractMetadata(pdfDoc) {
    try {
      // Obținem dicționarul de informații
      const info = pdfDoc.catalog.get(PDFName.of('Info'));
      if (!info) {
        console.log('No Info dictionary found');
        return {};
      }

      // Extragem câmpurile standard
      const metadata = {
        title: this.extractString(info, 'Title'),
        author: this.extractString(info, 'Author'),
        subject: this.extractString(info, 'Subject'),
        keywords: this.extractString(info, 'Keywords')?.split(' ') || [],
        creator: this.extractString(info, 'Creator'),
        producer: this.extractString(info, 'Producer')
      };

      // Extragem informațiile despre semnături
      const signaturesInfo = this.extractString(info, 'SignaturesInfo');
      if (signaturesInfo) {
        try {
          metadata.signatures = JSON.parse(signaturesInfo);
        } catch (error) {
          console.error('Error parsing signatures:', error);
          metadata.signatures = [];
        }
      } else {
        metadata.signatures = [];
      }

      return metadata;
    } catch (error) {
      console.error('Error extracting metadata:', error);
      throw new Error(`Eroare la extragerea metadatelor: ${error.message}`);
    }
  }

  /**
   * Extrage un string dintr-un dicționar PDF
   * @private
   */
  extractString(dict, key) {
    const value = dict.get(PDFName.of(key));
    if (!value) return '';
    
    // Dacă valoarea este un PDFString, o decodăm
    if (value instanceof PDFString) {
      return value.decodeText();
    }
    
    // Altfel, încercăm să convertim la string
    return String(value);
  }
}

// Exportăm clasa pentru a putea fi folosită în alte module
module.exports = PDFManipulator;