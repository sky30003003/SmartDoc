import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box,
  Typography,
  Button,
  Alert,
  Grid,
  CircularProgress,
  Paper,
  Divider,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import AdminPageHeader from '../common/AdminPageHeader';
import {
  People as PeopleIcon,
  Group as GroupIcon,
  Description as DocumentIcon
} from '@mui/icons-material';

const ViewOrganization = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resetDialog, setResetDialog] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(false);

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/organizations/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Eroare la obținerea datelor organizației');
        }

        const data = await response.json();
        setOrganization(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [id]);

  const handleConfirmReset = () => {
    setConfirmDialog(true);
  };

  const handleResetPassword = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/organizations/${id}/reset-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Eroare la resetarea parolei');
      }

      const data = await response.json();
      setNewPassword(data.password);
      setResetSuccess(true);
      setResetDialog(true);
      setConfirmDialog(false);
    } catch (error) {
      setError(error.message);
      setConfirmDialog(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <AdminPageHeader 
        mainTitle={organization ? `Dashboard Administrator :: Vizualizare Organizație :: ${organization.name}` : 'Dashboard Administrator :: Vizualizare Organizație'}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PeopleIcon sx={{ mr: 1, color: 'rgb(52, 71, 103)' }} />
                    <Typography variant="h6" sx={{ color: 'rgb(52, 71, 103)' }}>
                      Angajați
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ color: 'rgb(52, 71, 103)', fontWeight: 500 }}>
                    {organization?.stats?.employees || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <GroupIcon sx={{ mr: 1, color: 'rgb(52, 71, 103)' }} />
                    <Typography variant="h6" sx={{ color: 'rgb(52, 71, 103)' }}>
                      Colaboratori
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ color: 'rgb(52, 71, 103)', fontWeight: 500 }}>
                    {organization?.stats?.collaborators || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <DocumentIcon sx={{ mr: 1, color: 'rgb(52, 71, 103)' }} />
                    <Typography variant="h6" sx={{ color: 'rgb(52, 71, 103)' }}>
                      Documente
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ color: 'rgb(52, 71, 103)', fontWeight: 500 }}>
                    {organization?.stats?.documents || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper sx={{ p: 3, borderRadius: 1 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" gutterBottom sx={{ color: 'rgb(52, 71, 103)', fontWeight: 600 }}>
                    Detalii Organizație
                  </Typography>
                  <Divider />
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" sx={{ color: 'rgb(123, 128, 154)', mb: 1 }}>
                  Nume Organizație
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgb(52, 71, 103)', fontWeight: 500 }}>
                  {organization?.name}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" sx={{ color: 'rgb(123, 128, 154)', mb: 1 }}>
                  CUI/CNP
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgb(52, 71, 103)', fontWeight: 500 }}>
                  {organization?.cuiCnp}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" sx={{ color: 'rgb(123, 128, 154)', mb: 1 }}>
                  Email
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgb(52, 71, 103)', fontWeight: 500 }}>
                  {organization?.email}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" sx={{ color: 'rgb(123, 128, 154)', mb: 1 }}>
                  Telefon
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgb(52, 71, 103)', fontWeight: 500 }}>
                  {organization?.phone}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => navigate('/organizations')}
                  >
                    Înapoi la Lista
                  </Button>
                  <Button 
                    variant="contained"
                    onClick={() => navigate(`/organizations/${id}/edit`)}
                    sx={{
                      background: 'linear-gradient(195deg, rgb(73, 163, 241), rgb(26, 115, 232))',
                      '&:hover': {
                        background: 'linear-gradient(195deg, rgb(66, 147, 217), rgb(23, 103, 209))'
                      }
                    }}
                  >
                    Editează
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleConfirmReset}
              sx={{ mr: 2 }}
            >
              Reset Parolă Administrator
            </Button>
          </Box>

          <Dialog 
            open={confirmDialog} 
            onClose={() => setConfirmDialog(false)}
          >
            <DialogTitle sx={{ color: 'error.main' }}>
              Confirmare Resetare Parolă
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ color: 'error.main', fontWeight: 500 }}>
                ATENȚIE! Această acțiune va reseta parola administratorului organizației.
              </Typography>
              <Typography variant="body2" sx={{ mt: 2 }}>
                • O nouă parolă va fi generată
              </Typography>
              <Typography variant="body2">
                • Parola curentă nu va mai fi validă
              </Typography>
              <Typography variant="body2">
                • Un email cu noua parolă va fi trimis administratorului
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmDialog(false)}>
                Anulează
              </Button>
              <Button 
                onClick={handleResetPassword}
                variant="contained"
                color="error"
              >
                Confirmă Resetarea
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog 
            open={resetDialog} 
            onClose={() => setResetDialog(false)}
          >
            <DialogTitle>
              {resetSuccess ? 'Parolă Resetată cu Succes' : 'Eroare'}
            </DialogTitle>
            <DialogContent>
              {resetSuccess ? (
                <>
                  <Typography variant="body1" gutterBottom>
                    Noua parolă pentru administratorul organizației a fost setată și trimisă pe email.
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 2, fontWeight: 'bold' }}>
                    Noua parolă este: {newPassword}
                  </Typography>
                </>
              ) : (
                <Alert severity="error">
                  {error}
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setResetDialog(false)}>
                Închide
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Container>
  );
};

export default ViewOrganization; 