import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Document, Page } from 'react-pdf';
import { NavigateBefore, NavigateNext } from '@mui/icons-material';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import '../../utils/pdfjs-config';
import { QRCodeSVG } from 'qrcode.react';

const SignDocument = () => {
  const { documentId, employeeId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [documentDetails, setDocumentDetails] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [pdfError, setPdfError] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [statusDialog, setStatusDialog] = useState(null);
  const [loadingSignatures, setLoadingSignatures] = useState(false);
  const [signatureStatuses, setSignatureStatuses] = useState({});

  useEffect(() => {
    fetchDocumentDetails();
  }, [documentId, employeeId]);

  const fetchDocumentDetails = async () => {
    try {
      console.log('Fetching document details...');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/documents/${documentId}/sign/${employeeId}/details`
      );

      if (!response.ok) {
        throw new Error('Link-ul este invalid sau a expirat');
      }

      const data = await response.json();
      console.log('Document details received:', {
        id: data.document._id,
        title: data.document.title,
        signatureSettings: data.document.signatureSettings
      });
      setDocumentDetails(data);
    } catch (error) {
      console.error('Error fetching document details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('Starting document signing process');
      
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/documents/${documentId}/sign/${employeeId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        console.error('Error signing document:', result);
        throw new Error(result.error || result.message || 'Eroare la semnarea documentului');
      }

      console.log('Document signed successfully:', result);
      setSuccessMessage('Documentul a fost semnat cu succes!');
      setConfirmDialog(false);
    } catch (error) {
      console.error('Error in handleSign:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    console.log('PDF loaded successfully with', numPages, 'pages');
    setNumPages(numPages);
    setLoadingPdf(false);
    setPdfError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error('Error loading PDF:', error);
    setPdfError(error.message || 'Eroare la încărcarea documentului');
    setLoadingPdf(false);
  };

  const handleStatusDialogOpen = async (document) => {
    setStatusDialog({ open: true, document });
    setLoadingSignatures(true);
    
    try {
      const token = localStorage.getItem('token');
      // Filtrăm doar copiile semnate
      const signedCopies = document.employeeCopies.filter(copy => copy.status === 'signed');
      
      // Verificăm toate semnăturile în paralel
      const verificationPromises = signedCopies.map(copy => 
        fetch(
          `${process.env.REACT_APP_API_URL}/api/documents/${document._id}/verify/${copy.employee}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        ).then(async response => {
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message);
          }
          return {
            employeeId: copy.employee,
            isValid: result.isValid
          };
        }).catch(error => ({
          employeeId: copy.employee,
          isValid: false
        }))
      );

      // Așteptăm toate verificările să se termine
      const results = await Promise.all(verificationPromises);
      
      // Actualizăm toate statusurile într-o singură operație
      const newStatuses = {};
      results.forEach(({ employeeId, isValid }) => {
        newStatuses[`${document._id}-${employeeId}`] = isValid;
      });
      
      setSignatureStatuses(newStatuses);
    } catch (error) {
      console.error('Error verifying signatures:', error);
    } finally {
      setLoadingSignatures(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (successMessage) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
        <Typography variant="body1" align="center" sx={{ mt: 2 }}>
          Puteți închide această pagină în siguranță.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {documentDetails?.document.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {documentDetails?.document.description}
        </Typography>
        <Typography variant="body2" gutterBottom>
          Semnatar: {documentDetails?.employee.firstName} {documentDetails?.employee.lastName}
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3, minHeight: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ width: '100%', overflow: 'auto', mb: 2 }}>
          {loadingPdf && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 500 }}>
              <CircularProgress />
            </Box>
          )}
          
          {pdfError && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 500 }}>
              <Alert severity="error">
                {pdfError}
                <br />
                <Button 
                  onClick={() => {
                    setLoadingPdf(true);
                    setPdfError(null);
                  }}
                  sx={{ mt: 1 }}
                >
                  Încearcă din nou
                </Button>
              </Alert>
            </Box>
          )}

          <Document
            file={`${process.env.REACT_APP_API_URL}/api/documents/${documentId}/sign/${employeeId}/download`}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            error={null}
          >
            <Box sx={{ position: 'relative' }}>
              <Page 
                pageNumber={pageNumber} 
                renderTextLayer={false}
                renderAnnotationLayer={false}
                scale={1.2}
                loading={null}
                error={null}
              />
              {documentDetails?.document.signatureSettings?.printSignature && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: '50px',
                    right: '50px',
                    padding: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    pointerEvents: 'none',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2
                  }}
                >
                  {console.log('Rendering signature preview with settings:', {
                    printSignature: documentDetails.document.signatureSettings?.printSignature,
                    includeQRCode: documentDetails.document.signatureSettings?.includeQRCode
                  })}
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      Semnat digital de:<br />
                      {documentDetails?.employee.firstName} {documentDetails?.employee.lastName}<br />
                      CNP: {documentDetails?.employee.cnp}<br />
                      Data: {new Date().toLocaleDateString('ro-RO')}
                    </Typography>
                  </Box>
                  {documentDetails?.document.signatureSettings?.includeQRCode && (
                    <Box sx={{ ml: 2 }}>
                      {console.log('Rendering QR code with URL:', `${window.location.origin}/verify/${documentDetails.document._id}/${documentDetails.employee._id}`)}
                      <QRCodeSVG
                        value={`${window.location.origin}/verify/${documentDetails.document._id}/${documentDetails.employee._id}`}
                        size={100}
                        level="H"
                        includeMargin={true}
                      />
                      <Typography variant="caption" color="text.secondary" display="block" align="center" sx={{ mt: 1 }}>
                        Scanează pentru verificare
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </Document>
        </Box>

        {numPages > 1 && (
          <Box sx={{ mb: 2 }}>
            <Typography>
              Pagina {pageNumber} din {numPages}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Button
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber(pageNumber - 1)}
              >
                Pagina anterioară
              </Button>
              <Button
                disabled={pageNumber >= numPages}
                onClick={() => setPageNumber(pageNumber + 1)}
              >
                Pagina următoare
              </Button>
            </Box>
          </Box>
        )}

        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={() => setConfirmDialog(true)}
          sx={{ mt: 2 }}
        >
          Semnează Documentul
        </Button>
      </Paper>

      <Dialog
        open={confirmDialog}
        onClose={() => setConfirmDialog(false)}
      >
        <DialogTitle>Confirmă semnarea documentului</DialogTitle>
        <DialogContent>
          <Typography>
            Sunteți sigur că doriți să semnați acest document? Această acțiune nu poate fi anulată.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Anulează</Button>
          <Button onClick={handleSign} variant="contained" color="primary">
            Confirmă Semnarea
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SignDocument; 