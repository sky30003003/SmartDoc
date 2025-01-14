import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, IconButton, Tooltip, Typography, Box, Divider } from '@mui/material';
import { VerifiedUser, ErrorOutline, HourglassEmpty, Visibility, Close } from '@mui/icons-material';

const SignatureStatusDialog = ({ open, onClose, document, onVerifyClick, onViewDocument }) => {
  const [verificationDetails, setVerificationDetails] = useState(null);
  const [verifiedCopyId, setVerifiedCopyId] = useState(null);

  const handleVerifyClick = async (documentId, signatureId, copy) => {
    try {
      console.log('Requesting verification for:', { documentId, signatureId });
      const result = await onVerifyClick(documentId, signatureId);
      console.log('Received verification result:', result);
      
      if (result && result.isValid !== undefined) {
        setVerificationDetails(result);
        setVerifiedCopyId(copy._id);
      } else {
        console.error('Invalid verification result received:', result);
      }
    } catch (error) {
      console.error('Error verifying signature:', error);
      setVerificationDetails(null);
      setVerifiedCopyId(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
        Status Semnături
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {document?.employeeCopies?.length > 0 ? (
          <List>
            {document.employeeCopies.map((copy) => (
              <React.Fragment key={copy._id}>
                <ListItem>
                  <ListItemText
                    primary={copy.employeeName}
                    secondary={`Status: ${copy.status === 'signed' ? 'Semnat' : copy.status === 'pending_signature' ? 'În așteptare' : 'Netrimis'}`}
                  />
                  {copy.status === 'signed' && (
                    <>
                      <Tooltip title="Vezi documentul">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => onViewDocument(document, copy)}
                          sx={{ mr: 1 }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Verifică semnătura">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleVerifyClick(document._id, copy._id, copy)}
                        >
                          <VerifiedUser />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </ListItem>
                {verificationDetails && verifiedCopyId === copy._id && (
                  <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, my: 1 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Detalii Semnătură:
                    </Typography>
                    <Typography variant="body2">
                      Semnat de: {verificationDetails.signedBy}
                    </Typography>
                    <Typography variant="body2">
                      Data semnării: {new Date(verificationDetails.signedAt).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                      Hash document: {verificationDetails.documentHash}
                    </Typography>
                    <Typography variant="body2" color={verificationDetails.isValid ? 'success.main' : 'error.main'}>
                      Status verificare: {verificationDetails.isValid ? 'Valid' : 'Invalid'}
                    </Typography>
                  </Box>
                )}
                <Divider />
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Typography>Nu există copii ale documentului</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SignatureStatusDialog; 