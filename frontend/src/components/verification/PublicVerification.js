import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Grid,
  Divider
} from '@mui/material';
import {
  VerifiedUser as VerifiedIcon,
  Error as ErrorIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Business as BusinessIcon
} from '@mui/icons-material';

const PublicVerification = () => {
  const { documentId, signatureId } = useParams();
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifySignature = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/verify-signature/${documentId}/${signatureId}`);
        if (!response.ok) {
          throw new Error('Verificarea semnăturii a eșuat');
        }
        const data = await response.json();
        setVerificationResult(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    verifySignature();
  }, [documentId, signatureId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          {verificationResult?.isValid ? (
            <VerifiedIcon color="success" sx={{ fontSize: 64 }} />
          ) : (
            <ErrorIcon color="error" sx={{ fontSize: 64 }} />
          )}
          <Typography variant="h4" component="h1" gutterBottom>
            {verificationResult?.isValid ? 'Semnătură Validă' : 'Semnătură Invalidă'}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {verificationResult?.isValid 
              ? 'Documentul a fost semnat electronic și nu a fost modificat' 
              : 'Documentul a fost modificat după semnare sau semnătura este invalidă'}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonIcon sx={{ mr: 1 }} color="primary" />
              <Typography variant="h6">Semnatar</Typography>
            </Box>
            <Typography variant="body1">{verificationResult?.signerName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {verificationResult?.signerEmail}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BusinessIcon sx={{ mr: 1 }} color="primary" />
              <Typography variant="h6">Organizație</Typography>
            </Box>
            <Typography variant="body1">{verificationResult?.organization}</Typography>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TimeIcon sx={{ mr: 1 }} color="primary" />
              <Typography variant="h6">Momentul Semnării</Typography>
            </Box>
            <Typography variant="body1">
              {new Date(verificationResult?.signedAt).toLocaleString('ro-RO', {
                dateStyle: 'long',
                timeStyle: 'long'
              })}
            </Typography>
          </Grid>

          {!verificationResult?.isValid && verificationResult?.error && (
            <Grid item xs={12}>
              <Alert severity="error" sx={{ mt: 2 }}>
                Motiv: {verificationResult.error}
              </Alert>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Container>
  );
};

export default PublicVerification; 