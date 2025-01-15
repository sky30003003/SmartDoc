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
   * @param {Object} options - Opțiuni pentru semnătura vizuală
   * @returns {Promise<Object>} Dimensiunile și poziția semnăturii
   */
  async addVisualSignature(pdfDoc, signatureInfo, options = {}) {
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
  async _calculateSignatureBox(pdfDoc, signatureInfo, options) {
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
  async _drawSignatureBackground(page, x, y, width, height) {
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
  async _addSignatureText(page, signatureInfo, position) {
    const font = await page.doc.embedFont(StandardFonts.TimesRoman);
    const fontSize = 10;

    // Eliminăm diacriticele din text pentru siguranță
    const normalizeText = (text) => {
      return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };

    const textLines = [
      `Semnat digital de: ${normalizeText(signatureInfo.signerName)}`,
      `Email: ${signatureInfo.signerEmail}`,
      `Organizatie: ${normalizeText(signatureInfo.organization)}`,
      `Data: ${new Date(signatureInfo.signedAt || Date.now()).toLocaleString('ro-RO')}`,
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
  async _addSignatureQR(page, signatureInfo, position) {
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

  /**
   * Salvează documentul PDF
   * @param {PDFDocument} pdfDoc - Documentul PDF
   * @returns {Promise<Buffer>} Buffer-ul documentului PDF
   */
  async savePDF(pdfDoc) {
    try {
      // Ne asigurăm că toate obiectele sunt actualizate
      await pdfDoc.flush();
      
      // Salvăm documentul cu opțiuni consistente
      const pdfBytes = await pdfDoc.save(PDF_SAVE_OPTIONS);
      
      // Convertim la Buffer și verificăm rezultatul
      const buffer = Buffer.from(pdfBytes);
      if (!buffer || buffer.length === 0) {
        throw new Error('PDF-ul generat este gol');
      }
      
      console.log('PDF saved successfully, size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('Detalii eroare salvare PDF:', error);
      throw new Error(`Eroare la salvarea PDF-ului: ${error.message}`);
    }
  }
}

module.exports = PDFManipulator; 