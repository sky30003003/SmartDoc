import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper, Alert } from '@mui/material';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Ne asigurăm că nu există nicio sesiune activă
    logout();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      console.log('Login response:', data); // pentru debugging
      
      if (!response.ok) {
        throw new Error(data.message || 'Autentificare eșuată');
      }

      login(data.token, data.user);
      // Ne asigurăm că suntem redirecționați către ruta corectă
      const route = data.user.role === 'org_admin' ? '/org-admin' : '/dashboard';
      console.log('Redirecting to:', route);
      navigate(route);
    } catch (err) {
      console.error('Eroare login:', err);
      setError(err.message || 'Eroare la autentificare');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(45deg, #2563eb 30%, #7c3aed 90%)',
        p: 3
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          borderRadius: 4,
          backdropFilter: 'blur(20px)',
          bgcolor: 'rgba(255, 255, 255, 0.9)',
        }}
      >
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          sx={{ 
            textAlign: 'center',
            color: 'primary.main',
            fontWeight: 'bold',
            mb: 4
          }}
        >
          SmartDoc
        </Typography>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              borderRadius: 2
            }}
          >
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Parolă"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 500,
              boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 6px 8px rgba(37, 99, 235, 0.3)',
              }
            }}
          >
            Autentificare
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login; 