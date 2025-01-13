import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  CircularProgress,
  Paper
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';

const SignatureSettings = () => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState({
    printSignature: true,
    includeQRCode: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/organizations/${currentUser.organization}/signature-settings`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Nu s-au putut încărca setările');
      }

      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async (setting) => {
    try {
      const newSettings = {
        ...settings,
        ...setting
      };

      if (setting.printSignature === false) {
        newSettings.includeQRCode = false;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/organizations/${currentUser.organization}/signature-settings`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newSettings)
        }
      );

      if (!response.ok) {
        throw new Error('Nu s-au putut actualiza setările');
      }

      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Update error:', error);
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
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Setări Semnătură Digitală
      </Typography>
      
      <Box sx={{ mt: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.printSignature}
              onChange={(e) => handleSettingChange({ printSignature: e.target.checked })}
              disabled={loading}
            />
          }
          label="Imprimă semnătura digitală pe document"
        />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
          Când este activat, semnătura digitală va fi vizibilă pe document
        </Typography>
      </Box>

      <Box sx={{ mt: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.includeQRCode}
              onChange={(e) => handleSettingChange({ includeQRCode: e.target.checked })}
              disabled={loading || !settings.printSignature}
            />
          }
          label="Include cod QR pentru validare rapidă"
        />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
          Când este activat, un cod QR va fi inclus în semnătură pentru validare rapidă
        </Typography>
      </Box>
    </Paper>
  );
};

export default SignatureSettings; 