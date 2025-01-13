import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const ConfirmAccount = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  useEffect(() => {
    logout();
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Parolele nu coincid');
      return;
    }

    setLoading(true);
    const apiUrl = `${process.env.REACT_APP_API_URL}/api/auth/confirm-account/${token}`;
    const requestBody = { newPassword: formData.newPassword };

    console.log('Sending request to:', apiUrl);
    console.log('With body:', requestBody);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword: formData.newPassword })
      });

      console.log('Response received:', {
        status: response.status,
        ok: response.ok
      });

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'A apărut o eroare');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      console.error('Complete error:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack
      });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button 
            onClick={logout}
            size="small"
            color="inherit"
          >
            Logout
          </Button>
        </Box>
        <Typography variant="h5" gutterBottom align="center">
          Confirmă Contul
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Cont confirmat cu succes! Veți fi redirecționat către pagina de autentificare.
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            required
            fullWidth
            type="password"
            label="Parolă Nouă"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            margin="normal"
          />

          <TextField
            required
            fullWidth
            type="password"
            label="Confirmă Parola"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            margin="normal"
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{ mt: 3 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Confirmă și Schimbă Parola'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default ConfirmAccount; 