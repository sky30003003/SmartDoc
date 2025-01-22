const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
const forge = require('node-forge');

class DSSService {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'https://ec.europa.eu/digital-building-blocks/DSS/webapp-demo/services/rest',
      ...config
    };
    
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  async _generateCertificate(signatureInfo) {
    // Generăm o pereche de chei RSA
    const keys = forge.pki.rsa.generateKeyPair(2048);
    
    // Creăm un certificat
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    
    const now = new Date();
    cert.validity.notBefore = now;
    const expiry = new Date();
    expiry.setFullYear(now.getFullYear() + 1);
    cert.validity.notAfter = expiry;

    const attrs = [{
      name: 'commonName',
      value: `${signatureInfo.firstName} ${signatureInfo.lastName}`
    }, {
      name: 'countryName',
      value: 'RO'
    }, {
      shortName: 'O',
      value: signatureInfo.organization || 'N/A'
    }, {
      shortName: 'OU',
      value: signatureInfo.identityNumber || 'N/A'
    }];

    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    
    cert.sign(keys.privateKey, forge.md.sha256.create());
    
    return {
      certificate: forge.pki.certificateToPem(cert),
      privateKey: forge.pki.privateKeyToPem(keys.privateKey)
    };
  }

  async _checkSignaturePosition(signaturePosition, existingPositions = []) {
    // Verificăm dacă poziția este validă și nu se suprapune cu alte semnături
    if (!signaturePosition || !signaturePosition.page || !signaturePosition.x || !signaturePosition.y) {
      throw new Error('Poziția semnăturii trebuie să conțină page, x și y');
    }

    // Dimensiuni implicite pentru zona semnăturii (în puncte PDF)
    const signatureWidth = signaturePosition.width || 190;
    const signatureHeight = signaturePosition.height || 50;

    // Verificăm suprapunerea cu alte semnături
    const hasOverlap = existingPositions.some(pos => {
      if (pos.page !== signaturePosition.page) return false;

      const horizontalOverlap = 
        signaturePosition.x < (pos.x + pos.width) && 
        (signaturePosition.x + signatureWidth) > pos.x;

      const verticalOverlap = 
        signaturePosition.y < (pos.y + pos.height) && 
        (signaturePosition.y + signatureHeight) > pos.y;

      return horizontalOverlap && verticalOverlap;
    });

    if (hasOverlap) {
      throw new Error('Poziția semnăturii se suprapune cu o semnătură existentă');
    }

    return {
      ...signaturePosition,
      width: signatureWidth,
      height: signatureHeight
    };
  }

  async signDocument(pdfBuffer, signatureInfo, signaturePosition = null) {
    try {
      console.log('Începe semnarea documentului cu DSS...');
      
      // Validăm documentul și obținem pozițiile semnăturilor existente
      const existingSignatures = await this.validateSignature(pdfBuffer);
      const existingPositions = existingSignatures.signatures
        .map(sig => sig.documentModifications
          .filter(mod => mod.type === 'SIGNATURE_FIELD')
          .map(mod => this._parseSignaturePosition(mod.area))
        ).flat();

      // Verificăm și validăm poziția noii semnături
      if (signaturePosition) {
        await this._checkSignaturePosition(signaturePosition, existingPositions);
      }
      
      // Generăm certificatul
      const { certificate, privateKey } = await this._generateCertificate(signatureInfo);
      
      const getDataRequest = {
        toSignDocument: {
          bytes: pdfBuffer.toString('base64'),
          name: 'document.pdf'
        },
        parameters: {
          signatureLevel: 'PAdES_BASELINE_B',
          signaturePackaging: 'ENVELOPED',
          digestAlgorithm: 'SHA256',
          signWithExpiredCertificate: false,
          generateTBSWithoutCertificate: false,
          signingCertificate: {
            encodedCertificate: certificate.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\r?\n/g, '')
          },
          blevelParams: {
            signingDate: new Date().toISOString(),
            commitmentTypeIndications: ['ProofOfApproval'],
            signerLocationCountry: 'RO',
            signerLocationLocality: signatureInfo.city || 'N/A',
            claimedSignerRoles: [
              signatureInfo.role || 'Semnatar',
              `CNP: ${signatureInfo.identityNumber || 'N/A'}`,
              ...(signaturePosition ? [`Position: page=${signaturePosition.page},x=${signaturePosition.x},y=${signaturePosition.y},w=${signaturePosition.width || 190},h=${signaturePosition.height || 50}`] : [])
            ]
          },
          signatureAlgorithm: 'RSA_SHA256',
          encryptionAlgorithm: 'RSA',
          referenceDigestAlgorithm: 'SHA256'
        }
      };

      console.log('Obțin datele pentru semnare...');
      const dataToSignResponse = await this.client.post('/signature/one-document/getDataToSign', getDataRequest);

      if (!dataToSignResponse.data || !dataToSignResponse.data.bytes) {
        throw new Error('Răspunsul de la server nu conține datele pentru semnare');
      }

      // Semnăm datele primite folosind cheia privată
      const dataToSign = Buffer.from(dataToSignResponse.data.bytes, 'base64');
      const privateKeyObj = forge.pki.privateKeyFromPem(privateKey);
      const md = forge.md.sha256.create();
      md.update(dataToSign.toString('binary'));
      const signature = privateKeyObj.sign(md);
      const signatureValue = forge.util.encode64(signature);

      // Trimitem semnătura pentru finalizare
      const signDocumentRequest = {
        toSignDocument: {
          bytes: pdfBuffer.toString('base64'),
          name: 'document.pdf'
        },
        parameters: getDataRequest.parameters,
        signatureValue: {
          algorithm: 'RSA_SHA256',
          value: signatureValue
        }
      };

      console.log('Trimit semnătura pentru finalizare...');
      const signedResponse = await this.client.post('/signature/one-document/signDocument', signDocumentRequest);

      if (!signedResponse.data || !signedResponse.data.bytes) {
        throw new Error('Răspunsul final de la server nu conține documentul semnat');
      }

      return Buffer.from(signedResponse.data.bytes, 'base64');
    } catch (error) {
      console.error('Eroare la semnarea documentului cu DSS:', error.response?.data || error.message);
      throw new Error(`Eroare la semnarea documentului cu DSS: ${error.message}`);
    }
  }

  _parseSignaturePosition(areaDescription) {
    // Parsăm descrierea poziției din SignatureScope
    // Format exemplu: "Signature Field on page 1 at position (100, 100) with dimensions 190x50"
    const match = areaDescription.match(/page (\d+) at position \((\d+), (\d+)\)(?: with dimensions (\d+)x(\d+))?/);
    if (!match) return null;

    return {
      page: parseInt(match[1]),
      x: parseInt(match[2]),
      y: parseInt(match[3]),
      width: match[4] ? parseInt(match[4]) : 190,
      height: match[5] ? parseInt(match[5]) : 50
    };
  }

  _extractPositionFromRoles(roles = []) {
    const positionRole = roles.find(role => role.startsWith('Position:'));
    if (!positionRole) return null;

    const positionMatch = positionRole.match(/page=(\d+),x=(\d+),y=(\d+),w=(\d+),h=(\d+)/);
    if (!positionMatch) return null;

    return {
      page: parseInt(positionMatch[1]),
      x: parseInt(positionMatch[2]),
      y: parseInt(positionMatch[3]),
      width: parseInt(positionMatch[4]),
      height: parseInt(positionMatch[5])
    };
  }

  async validateSignature(signedPdfBuffer) {
    try {
      const validateRequest = {
        signedDocument: {
          bytes: signedPdfBuffer.toString('base64'),
          name: 'document.pdf'
        }
      };

      const response = await this.client.post('/validation/validateSignature', validateRequest);

      if (!response.data) {
        throw new Error('Răspunsul de la server nu conține rezultatul validării');
      }

      // Procesăm toate semnăturile în ordinea aplicării
      const signatures = response.data.SimpleReport?.signatureOrTimestampOrEvidenceRecord
        ?.filter(item => item.Signature)
        ?.map((item, index) => {
          const signature = item.Signature;
          const certId = signature?.CertificateChain?.Certificate?.[0]?.Id;
          const certificate = response.data.DiagnosticData?.Certificate
            ?.find(cert => cert.Id === certId);

          // Extragem CNP-ul din roluri
          const cnpRole = signature.ClaimedRoles?.find(role => role.startsWith('CNP:'));
          const identityNumber = cnpRole ? cnpRole.split('CNP:')[1].trim() : null;

          // Extragem poziția semnăturii din roluri
          const position = this._extractPositionFromRoles(signature.ClaimedRoles);

          // Extragem informații despre modificări din SignatureScope
          const documentModifications = signature.SignatureScope?.map(scope => ({
            type: scope.scope,
            area: scope.value,
            name: scope.name,
            position: position
          })) || [];

          // Considerăm semnătura validă dacă este TOTAL_PASSED, PASSED sau INDETERMINATE
          // dar nu are erori critice
          const isValid = 
            signature.Indication === 'TOTAL_PASSED' || 
            signature.Indication === 'PASSED' ||
            (signature.Indication === 'INDETERMINATE' && 
             signature.SubIndication === 'NO_CERTIFICATE_CHAIN_FOUND' &&
             !signature.AdESValidationDetails?.Error?.some(e => 
               e.value && !e.value.includes('trust anchor')));

          return {
            order: index + 1, // Ordinea semnăturii
            signer: {
              name: signature.SignedBy,
              identityNumber: identityNumber || certificate?.OrganizationalUnit,
              organization: certificate?.OrganizationName,
              country: certificate?.CountryName
            },
            timestamp: signature.SigningTime,
            bestSignatureTime: signature.BestSignatureTime,
            level: signature.SignatureLevel?.value,
            format: signature.SignatureFormat,
            indication: signature.Indication,
            subIndication: signature.SubIndication,
            signatureId: signature.Id,
            position: position,
            documentModifications,
            errors: [
              ...(signature.AdESValidationDetails?.Error || []),
              ...(signature.QualificationDetails?.Error || [])
            ],
            warnings: [
              ...(signature.AdESValidationDetails?.Warning || []),
              ...(signature.QualificationDetails?.Warning || [])
            ],
            info: [
              ...(signature.AdESValidationDetails?.Info || []),
              ...(signature.QualificationDetails?.Info || [])
            ],
            valid: isValid
          };
        }) || [];

      // Verificăm dacă există modificări între semnături
      const modificationsReport = signatures.map((sig, index) => {
        if (index === 0) return null;
        const prevSig = signatures[index - 1];
        const timeDiff = new Date(sig.timestamp) - new Date(prevSig.timestamp);
        
        return {
          signatureId: sig.signatureId,
          previousSignatureId: prevSig.signatureId,
          timeGap: timeDiff,
          modifications: sig.documentModifications,
          positionChanged: JSON.stringify(sig.position) !== JSON.stringify(prevSig.position)
        };
      }).filter(Boolean);

      // Considerăm documentul valid dacă toate semnăturile sunt valide
      const validSignatures = signatures.filter(s => s.valid);
      const isValid = validSignatures.length === signatures.length && signatures.length > 0;

      return {
        valid: isValid,
        totalSignatures: signatures.length,
        validSignatures: validSignatures.length,
        signatures: signatures,
        modificationsReport,
        detailedReport: {
          policy: response.data.SimpleReport?.ValidationPolicy,
          timestamp: response.data.SimpleReport?.ValidationTime,
          documentName: response.data.SimpleReport?.DocumentName
        }
      };
    } catch (error) {
      console.error('Eroare la validarea semnăturii:', error.response?.data || error.message);
      throw new Error(`Eroare la validarea semnăturii: ${error.message}`);
    }
  }
}

module.exports = DSSService; 