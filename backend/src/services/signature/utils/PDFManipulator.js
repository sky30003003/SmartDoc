const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs').promises;

/**
 * Clasa pentru manipularea documentelor PDF cu suport pentru semnături multiple PAdES
 */
class PDFManipulator {
  /**
   * Încarcă un document PDF din buffer sau fișier
   * @param {Buffer|string} source - Buffer-ul sau path-ul documentului PDF
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
      return await PDFDocument.load(pdfBytes);
    } catch (error) {
      throw new Error(`Eroare la încărcarea PDF-ului: ${error.message}`);
    }
  }

  /**
   * Adaugă o semnătură vizuală în document
   * @param {PDFDocument} pdfDoc - Documentul PDF
   * @param {Object} signatureInfo - Informații despre semnătură
   * @param {Object} position - Poziția semnăturii în document
   * @returns {Promise<void>}
   */
  async addVisualSignature(pdfDoc, signatureInfo, position) {
    try {
      const pages = pdfDoc.getPages();
      const targetPage = position.page >= 0 && position.page < pages.length 
        ? pages[position.page] 
        : pages[pages.length - 1];

      const { width, height } = targetPage.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Calculăm dimensiunile pentru semnătura vizuală
      const signatureBox = this._calculateSignatureBox(
        width,
        height,
        position,
        signatureInfo.includeQR
      );

      // Adăugăm fundalul și bordul semnăturii
      this._drawSignatureBackground(targetPage, signatureBox);

      // Adăugăm textul semnăturii
      await this._addSignatureText(
        targetPage,
        font,
        signatureBox,
        signatureInfo
      );

      // Adăugăm QR code dacă este configurat
      if (signatureInfo.includeQR) {
        await this._addQRCode(
          pdfDoc,
          targetPage,
          signatureBox,
          signatureInfo.verificationUrl
        );
      }
    } catch (error) {
      throw new Error(`Eroare la adăugarea semnăturii vizuale: ${error.message}`);
    }
  }

  /**
   * Calculează dimensiunile și poziția box-ului semnăturii
   * @private
   */
  _calculateSignatureBox(pageWidth, pageHeight, position, includeQR) {
    const margin = 20;
    const boxWidth = includeQR ? 300 : 200;
    const boxHeight = 100;

    // Poziția implicită este în colțul din dreapta jos
    const defaultX = pageWidth - boxWidth - margin;
    const defaultY = margin;

    return {
      x: position.x || defaultX,
      y: position.y || defaultY,
      width: boxWidth,
      height: boxHeight,
      margin: margin
    };
  }

  /**
   * Desenează fundalul și bordul semnăturii
   * @private
   */
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

  /**
   * Adaugă textul semnăturii
   * @private
   */
  async _addSignatureText(page, font, box, signatureInfo) {
    const fontSize = 8;
    const lineHeight = fontSize * 1.5;
    let currentY = box.y + box.height - box.margin;

    const textLines = [
      'Semnat digital de:',
      `${signatureInfo.name}`,
      `Organizație: ${signatureInfo.organization}`,
      `Data: ${new Date(signatureInfo.timestamp).toLocaleString('ro-RO')}`,
      `ID Semnătură: ${signatureInfo.signatureId}`
    ];

    for (const line of textLines) {
      page.drawText(line, {
        x: box.x + box.margin,
        y: currentY,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
        opacity: 0.8
      });
      currentY -= lineHeight;
    }
  }

  /**
   * Adaugă codul QR pentru verificare
   * @private
   */
  async _addQRCode(pdfDoc, page, box, verificationUrl) {
    try {
      const qrSize = 80;
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
      throw new Error(`Eroare la adăugarea codului QR: ${error.message}`);
    }
  }

  /**
   * Salvează documentul PDF
   * @param {PDFDocument} pdfDoc - Documentul PDF
   * @returns {Promise<Buffer>} Buffer-ul documentului PDF
   */
  async savePDF(pdfDoc) {
    try {
      return await pdfDoc.save();
    } catch (error) {
      throw new Error(`Eroare la salvarea PDF-ului: ${error.message}`);
    }
  }

  /**
   * Adaugă metadatele semnăturii în PDF
   * @param {PDFDocument} pdfDoc - Documentul PDF
   * @param {Object} signatureInfo - Informațiile semnăturii
   */
  async addSignatureMetadata(pdfDoc, signatureInfo) {
    try {
      // Obținem metadatele existente sau inițializăm un obiect nou
      const existingMetadata = pdfDoc.getMetadata();
      const signatures = existingMetadata.signatures || [];

      // Adăugăm noua semnătură
      signatures.push({
        id: signatureInfo.signatureId,
        name: signatureInfo.name,
        organization: signatureInfo.organization,
        timestamp: signatureInfo.timestamp,
        type: 'PAdES-Basic',
        publicKey: signatureInfo.publicKey
      });

      // Actualizăm metadatele
      await pdfDoc.setMetadata({
        ...existingMetadata,
        signatures,
        producer: 'SmartDoc PAdES',
        creator: 'SmartDoc Signature Service'
      });
    } catch (error) {
      throw new Error(`Eroare la adăugarea metadatelor semnăturii: ${error.message}`);
    }
  }
}

module.exports = PDFManipulator; 