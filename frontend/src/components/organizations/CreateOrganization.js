import React, { useState } from 'react';
import { 
  Container, 
  Box,
  TextField,
  Button,
  Alert,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from '../common/AdminPageHeader';

const CreateOrganization = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    cuiCnp: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successDialog, setSuccessDialog] = useState(false);
  const [createdOrg, setCreatedOrg] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name.trim() || !formData.cuiCnp.trim() || 
        !formData.email.trim() || !formData.phone.trim()) {
      setError('Toate câmpurile sunt obligatorii');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Eroare la crearea organizației');
      }

      const data = await response.json();
      setCreatedOrg({
        name: formData.name,
        cuiCnp: formData.cuiCnp,
        email: formData.email,
        phone: formData.phone,
        password: `${formData.email.substring(0, 6)}123!`
      });
      setSuccessDialog(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <AdminPageHeader mainTitle="Dashboard Administrator :: Adaugă Organizație Nouă" />

      <Box 
        component="form" 
        onSubmit={handleSubmit}
        sx={{
          backgroundColor: 'white',
          borderRadius: 1,
          p: 3,
          boxShadow: 1
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="Nume Organizație"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="CUI/CNP"
              name="cuiCnp"
              value={formData.cuiCnp}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="Telefon"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/organizations')}
              >
                Anulează
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                disabled={loading}
                sx={{
                  background: 'linear-gradient(195deg, rgb(73, 163, 241), rgb(26, 115, 232))',
                  '&:hover': {
                    background: 'linear-gradient(195deg, rgb(66, 147, 217), rgb(23, 103, 209))'
                  }
                }}
              >
                {loading ? <CircularProgress size={24} /> : 'Salvează'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Dialog
        open={successDialog}
        onClose={() => {
          setSuccessDialog(false);
          navigate('/organizations');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'success.main' }}>
          Organizație creată cu succes!
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
              Detalii Organizație:
            </Typography>
            <Typography variant="body1">
              <strong>Nume:</strong> {createdOrg?.name}
            </Typography>
            <Typography variant="body1">
              <strong>CUI/CNP:</strong> {createdOrg?.cuiCnp}
            </Typography>
            <Typography variant="body1">
              <strong>Email:</strong> {createdOrg?.email}
            </Typography>
            <Typography variant="body1">
              <strong>Telefon:</strong> {createdOrg?.phone}
            </Typography>
          </Box>
          
          <Box sx={{ mt: 3, bgcolor: 'info.lighter', p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ color: 'info.main', fontWeight: 500 }}>
              Credențiale Administrator:
            </Typography>
            <Typography variant="body1">
              <strong>Email:</strong> {createdOrg?.email}
            </Typography>
            <Typography variant="body1">
              <strong>Parolă:</strong> {createdOrg?.password}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: 'info.main' }}>
              * Aceste credențiale au fost trimise pe emailul administratorului
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setSuccessDialog(false);
              navigate('/organizations');
            }}
            variant="contained"
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CreateOrganization; 