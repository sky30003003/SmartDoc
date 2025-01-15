import React, { useState, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  NavigateBefore,
  NavigateNext
} from '@mui/icons-material';
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const DocumentViewer = ({ document, open, onClose }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setPageNumber(1);
      setLoading(true);
      setError(null);
    }
  }, [open]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error('Error loading PDF:', error);
    setError('Eroare la încărcarea documentului: ' + error.message);
    setLoading(false);
  };

  const handlePrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  };

  if (!document) {
    return null;
  }

  const token = localStorage.getItem('token');
  const documentUrl = `${process.env.REACT_APP_API_URL}/api/documents/download/${document._id}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        {document.title}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Box sx={{ width: '100%', mb: 2 }}>
              <Alert 
                severity="error"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => {
                      setLoading(true);
                      setError(null);
                    }}
                  >
                    Încearcă din nou
                  </Button>
                }
              >
                {error}
              </Alert>
            </Box>
          )}

          <Document
            file={{
              url: documentUrl,
              httpHeaders: {
                'Authorization': `Bearer ${token}`
              },
              withCredentials: true
            }}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            error={null}
            options={{
              cMapUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/',
              cMapPacked: true
            }}
          >
            {!loading && !error && (
              <Page
                pageNumber={pageNumber}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={null}
                error={null}
              />
            )}
          </Document>

          {!loading && !error && numPages > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <IconButton 
                onClick={handlePrevPage}
                disabled={pageNumber <= 1}
              >
                <NavigateBefore />
              </IconButton>
              <Typography sx={{ mx: 2 }}>
                Pagina {pageNumber} din {numPages}
              </Typography>
              <IconButton
                onClick={handleNextPage}
                disabled={pageNumber >= numPages}
              >
                <NavigateNext />
              </IconButton>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Închide</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentViewer; 