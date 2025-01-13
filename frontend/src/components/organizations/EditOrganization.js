import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box,
  TextField,
  Button,
  Alert,
  Grid,
  CircularProgress
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import AdminPageHeader from '../common/AdminPageHeader';

const EditOrganization = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    name: '',
    cuiCnp: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        setFormData({
          name: data.name,
          cuiCnp: data.cuiCnp,
          email: data.email,
          phone: data.phone
        });
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [id]);

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

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/organizations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Eroare la actualizarea organizației');
      }

      navigate('/organizations');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <AdminPageHeader mainTitle="Dashboard Administrator :: Editare Organizație" />

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
    </Container>
  );
};

export default EditOrganization; 