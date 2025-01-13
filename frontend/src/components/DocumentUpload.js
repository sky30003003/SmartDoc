import React from 'react';
import { Box, Button } from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const DocumentUpload = ({ onUploadSuccess }) => {
  const { user } = useAuth();

  const handleDocumentUpload = async (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      console.log('Frontend - Start import documente');
      
      try {
        const token = localStorage.getItem('token');
        console.log('Frontend - Token obținut');

        for (let file of files) {
          console.log('Frontend - Procesare fișier:', {
            name: file.name,
            type: file.type,
            size: file.size
          });

          const formData = new FormData();
          formData.append('file', file);

          console.log('Frontend - Trimitere request către server');
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/documents`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: formData
          });

          console.log('Frontend - Răspuns primit:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Frontend - Eroare răspuns:', errorText);
            throw new Error(`Eroare la importul documentului ${file.name}: ${errorText}`);
          }

          const result = await response.json();
          console.log('Frontend - Răspuns procesat:', result);
        }

        // Reset input value
        event.target.value = '';
        
        // Notify parent component of successful upload
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } catch (error) {
        console.error('Frontend - Eroare completă:', error);
        alert('Eroare la importul documentelor. Vă rugăm încercați din nou.');
      }
    }
  };

  return (
    <Box>
      <input
        accept="application/pdf"
        style={{ display: 'none' }}
        id="document-upload"
        type="file"
        multiple
        onChange={handleDocumentUpload}
      />
      <label htmlFor="document-upload">
        <Button
          variant="contained"
          component="span"
          startIcon={<UploadIcon />}
        >
          Import Documente
        </Button>
      </label>
    </Box>
  );
};

export default DocumentUpload; 