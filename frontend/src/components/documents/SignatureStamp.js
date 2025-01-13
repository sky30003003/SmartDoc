import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Box, Typography } from '@mui/material';

const SignatureStamp = ({ signature, document, signatureSettings }) => {
  const verificationUrl = `${window.location.origin}/verify/${document._id}/${signature._id}`;

  if (!signatureSettings?.printSignature) {
    return null;
  }

  return (
    <Box
      sx={{
        border: '2px solid #1976d2',
        borderRadius: '4px',
        p: 2,
        maxWidth: 400,
        backgroundColor: '#f8f9fa'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Semnat electronic de:
          </Typography>
          <Typography variant="body2" gutterBottom>
            {signature.employeeName}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {signature.organization}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Data: {new Date(signature.signedAt).toLocaleString('ro-RO')}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            ID: {signature._id}
          </Typography>
        </Box>
        {signatureSettings?.includeQRCode && (
          <Box sx={{ ml: 2 }}>
            <QRCodeSVG
              value={verificationUrl}
              size={100}
              level="H"
              includeMargin={true}
            />
            <Typography variant="caption" color="text.secondary" display="block" align="center" sx={{ mt: 1 }}>
              Scanează pentru verificare
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SignatureStamp; 