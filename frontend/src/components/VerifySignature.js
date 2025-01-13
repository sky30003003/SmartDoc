import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Box,
  IconButton,
  Paper,
  Divider,
  Alert
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

const VerifySignature = ({ document, onClose, onSignatureDeleted }) => {
  const { user } = useAuth();
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [signatureStatuses, setSignatureStatuses] = useState({});

  const verifySignature = async (employeeId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/documents/${document._id}/verify/${employeeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error verifying signature:', error);
      return { isValid: false, error: error.message };
    }
  };

  const verifyAllSignatures = async () => {
    try {
      setLoading(true);
      const signedCopies = document.employeeCopies.filter(copy => copy.status === 'signed');
      
      const results = await Promise.all(
        signedCopies.map(async (copy) => {
          const result = await verifySignature(copy.employee);
          return {
            ...result,
            employeeId: copy.employee,
            signerInfo: {
              firstName: copy.employeeName?.split(' ')[0] || '',
              lastName: copy.employeeName?.split(' ')[1] || '',
              email: copy.employeeEmail,
              organizationName: document.organizationName
            },
            timestamp: copy.signedAt,
            documentHash: copy.documentHash
          };
        })
      );

      const signatures = results.map(result => ({
        signatureId: result.employeeId,
        isValid: result.isValid,
        error: result.error,
        signerInfo: result.signerInfo,
        timestamp: result.timestamp,
        documentHash: result.documentHash,
        signedBy: result.employeeId
      }));

      setVerificationResult({ signatures });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    verifyAllSignatures();
  }, []);

  const handleDeleteSignature = async (signatureId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/documents/${document._id}/signatures/${signatureId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Eroare la ștergerea semnăturii');
      }

      const updatedDocument = await response.json();
      onSignatureDeleted(updatedDocument);

      // Reîncărcăm semnăturile
      await verifyAllSignatures();
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6">
          Verificare Semnătură Electronică
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Document: {document.title}
          </Typography>
        </Box>
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {verificationResult && (
          <Paper elevation={0} variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Detalii Semnătură:
            </Typography>
            <List>
              {verificationResult.signatures?.map((sig) => (
                <ListItem key={sig.signatureId} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                      {sig.isValid ? (
                        <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                      ) : (
                        <CancelIcon color="error" sx={{ mr: 1 }} />
                      )}
                      <Typography variant="subtitle1">
                        Semnătură {sig.isValid ? 'validă' : 'invalidă'}
                      </Typography>
                    </Box>
                    {sig.signedBy === user?.sub && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteSignature(sig.signatureId)}
                        title="Șterge semnătura dvs. de pe acest document"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                  <Divider sx={{ width: '100%', my: 1 }} />
                  <Box sx={{ pl: 4 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Semnatar: {sig.signerInfo?.firstName} {sig.signerInfo?.lastName}
                    </Typography>
                    {sig.signerInfo?.email && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Adresă email: {sig.signerInfo.email}
                      </Typography>
                    )}
                    {sig.signerInfo?.organizationName && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Organizație: {sig.signerInfo.organizationName}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      Data semnării: {new Date(sig.timestamp).toLocaleString('ro-RO')}
                    </Typography>
                    {sig.documentHash && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        Hash document: {sig.documentHash}
                      </Typography>
                    )}
                    {sig.error && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {sig.error}
                      </Alert>
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Închide</Button>
      </DialogActions>
    </Dialog>
  );
};

export default VerifySignature; 