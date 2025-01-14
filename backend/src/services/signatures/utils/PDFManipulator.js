const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs').promises;

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
  static async loadPDF(source) {
    try {
      let pdfBytes;
      if (Buffer.isBuffer(source)) {
        pdfBytes = source;
      } else {
        pdfBytes = await fs.readFile(source);
      }
      return await PDFDocument.load(pdfBytes);
    } catch (error) {
      throw new Error(`Eroare la încărcarea PDF-ului: ${error.message}`);
    }
  }

  /**
   * Adaugă o semnătură vizuală la document
   * @param {PDFDocument} pdfDoc - Documentul PDF
   * @param {Object} signatureInfo - Informații despre semnătură
   * @param {Object} options - Opțiuni pentru semnătura vizuală
   * @returns {Promise<Object>} Dimensiunile și poziția semnăturii
   */
  static async addVisualSignature(pdfDoc, signatureInfo, options = {}) {
    try {
      const {
        page = 0,
        x = 50,
        y = 50,
        width = 200,
        height = 100,
        includeQR = true
      } = options;

      const pdfPage = pdfDoc.getPages()[page];
      if (!pdfPage) {
        throw new Error('Pagina specificată nu există în document');
      }

      // Calculăm dimensiunile semnăturii
      const signatureBox = await this._calculateSignatureBox(pdfDoc, signatureInfo, {
        width,
        height,
        includeQR
      });

      // Desenăm fundalul semnăturii
      await this._drawSignatureBackground(pdfPage, x, y, signatureBox.width, signatureBox.height);

      // Adăugăm textul semnăturii
      await this._addSignatureText(pdfPage, signatureInfo, {
        x,
        y,
        width: signatureBox.width,
        height: signatureBox.height
      });

      // Adăugăm codul QR dacă este solicitat
      if (includeQR) {
        await this._addSignatureQR(pdfPage, signatureInfo, {
          x: x + signatureBox.width - 80,
          y: y + 10,
          size: 70
        });
      }

      return {
        page,
        x,
        y,
        width: signatureBox.width,
        height: signatureBox.height
      };
    } catch (error) {
      throw new Error(`Eroare la adăugarea semnăturii vizuale: ${error.message}`);
    }
  }

  /**
   * Calculează dimensiunile necesare pentru semnătura vizuală
   * @private
   */
  static async _calculateSignatureBox(pdfDoc, signatureInfo, options) {
    const { width = 200, height = 100, includeQR = true } = options;
    
    // Ajustăm lățimea în funcție de prezența codului QR
    const finalWidth = includeQR ? width : width - 80;
    
    return {
      width: finalWidth,
      height: height
    };
  }

  /**
   * Desenează fundalul semnăturii
   * @private
   */
  static async _drawSignatureBackground(page, x, y, width, height) {
    // Desenăm un dreptunghi semi-transparent pentru fundal
    page.drawRectangle({
      x,
      y,
      width,
      height,
      color: rgb(0.95, 0.95, 0.95),
      opacity: 0.8,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1
    });
  }

  /**
   * Adaugă textul semnăturii
   * @private
   */
  static async _addSignatureText(page, signatureInfo, position) {
    const font = await page.doc.embedFont(StandardFonts.Helvetica);
    const fontSize = 10;

    const textLines = [
      `Semnat digital de: ${signatureInfo.signerName}`,
      `Email: ${signatureInfo.signerEmail}`,
      `Organizație: ${signatureInfo.organization}`,
      `Data: ${new Date(signatureInfo.signedAt).toLocaleString('ro-RO')}`,
      `ID: ${signatureInfo.signatureId}`
    ];

    let currentY = position.y + position.height - 20;
    const lineHeight = fontSize * 1.2;

    textLines.forEach(line => {
      page.drawText(line, {
        x: position.x + 10,
        y: currentY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0)
      });
      currentY -= lineHeight;
    });
  }

  /**
   * Adaugă codul QR pentru validare
   * @private
   */
  static async _addSignatureQR(page, signatureInfo, position) {
    try {
      // Generăm URL-ul de validare
      const validationUrl = `${process.env.REACT_APP_URL}/verify/${signatureInfo.documentHash}/${signatureInfo.signatureId}`;
      
      // Generăm codul QR
      const qrBuffer = await QRCode.toBuffer(validationUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: position.size
      });

      // Convertim codul QR în format PNG pentru PDF
      const qrImage = await page.doc.embedPng(qrBuffer);

      // Desenăm codul QR
      page.drawImage(qrImage, {
        x: position.x,
        y: position.y,
        width: position.size,
        height: position.size
      });
    } catch (error) {
      console.error('Eroare la generarea codului QR:', error);
      // Continuăm fără cod QR în caz de eroare
    }
  }

  /**
   * Adaugă metadate la documentul PDF
   * @param {PDFDocument} pdfDoc - Documentul PDF
   * @param {Object} metadata - Metadatele de adăugat
   */
  static async addMetadata(pdfDoc, metadata) {
    try {
      const info = pdfDoc.getInfoDict();
      
      // Adăugăm metadatele standard
      info.set('Title', metadata.title || '');
      info.set('Author', metadata.author || '');
      info.set('Subject', metadata.subject || '');
      info.set('Keywords', metadata.keywords || '');
      info.set('Creator', 'SmartDoc PAdES Signer');
      info.set('Producer', 'SmartDoc');

      // Adăugăm metadate personalizate pentru semnături
      if (metadata.signatures) {
        const signaturesMeta = JSON.stringify(metadata.signatures);
        info.set('SignaturesInfo', signaturesMeta);
      }
    } catch (error) {
      throw new Error(`Eroare la adăugarea metadatelor: ${error.message}`);
    }
  }

  /**
   * Salvează documentul PDF
   * @param {PDFDocument} pdfDoc - Documentul PDF
   * @returns {Promise<Buffer>} Buffer-ul documentului PDF
   */
  static async savePDF(pdfDoc) {
    try {
      return await pdfDoc.save();
    } catch (error) {
      throw new Error(`Eroare la salvarea PDF-ului: ${error.message}`);
    }
  }

  /**
   * Extrage metadatele din documentul PDF
   * @param {PDFDocument} pdfDoc - Documentul PDF
   * @returns {Object} Metadatele extrase
   */
  static async extractMetadata(pdfDoc) {
    try {
      const info = pdfDoc.getInfoDict();
      
      const metadata = {
        title: info.get('Title')?.toString() || '',
        author: info.get('Author')?.toString() || '',
        subject: info.get('Subject')?.toString() || '',
        keywords: info.get('Keywords')?.toString() || '',
        creator: info.get('Creator')?.toString() || '',
        producer: info.get('Producer')?.toString() || '',
        signatures: []
      };

      // Extragem informațiile despre semnături
      const signaturesMeta = info.get('SignaturesInfo')?.toString();
      if (signaturesMeta) {
        try {
          metadata.signatures = JSON.parse(signaturesMeta);
        } catch (e) {
          console.error('Eroare la parsarea metadatelor semnăturilor:', e);
        }
      }

      return metadata;
    } catch (error) {
      throw new Error(`Eroare la extragerea metadatelor: ${error.message}`);
    }
  }
}

module.exports = PDFManipulator; 