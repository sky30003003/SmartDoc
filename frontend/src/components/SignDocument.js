import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const SignDocument = ({ document, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState(null);

  const handleSign = async () => {
    try {
      setSigning(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/documents/${document.id}/sign`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Eroare la semnarea documentului');
      }

      const signedDocument = await response.json();
      onSuccess(signedDocument);
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setSigning(false);
    }
  };

  return (
    <Dialog open onClose={onClose}>
      <DialogTitle>Semnare Document</DialogTitle>
      <DialogContent>
        <Typography gutterBottom>
          Documentul: {document.title}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Semnătura electronică va fi asociată cu contul dvs. și va include un timestamp.
        </Typography>
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anulează</Button>
        <Button
          onClick={handleSign}
          variant="contained"
          disabled={signing}
          startIcon={signing && <CircularProgress size={20} />}
        >
          {signing ? 'Se semnează...' : 'Semnează'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SignDocument; 