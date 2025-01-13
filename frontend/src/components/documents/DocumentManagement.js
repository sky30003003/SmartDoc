import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Tooltip,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  ListItemIcon
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Send as SendIcon,
  Info as InfoIcon,
  VerifiedUser as VerifiedUserIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import OrgAdminPageHeader from '../common/OrgAdminPageHeader';
import { useAuth } from '../../context/AuthContext';
import { useSignature } from '../../context/SignatureContext';
import SignatureStatusDialog from './SignatureStatusDialog';
import DocumentViewer from './DocumentViewer';

const DocumentManagement = () => {
  const { currentUser, organizationName } = useAuth();
  const { verifySignature, getVerificationResult, clearVerificationData } = useSignature();
  const { enqueueSnackbar } = useSnackbar();
  const [documents, setDocuments] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    document: null,
    isBulk: false
  });
  const [signDialog, setSignDialog] = useState({
    open: false,
    document: null
  });
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    file: null
  });
  const [downloading, setDownloading] = useState(false);
  const [sendToSignDialog, setSendToSignDialog] = useState({
    open: false,
    document: null
  });
  const [successMessage, setSuccessMessage] = useState(null);
  const [statusDialog, setStatusDialog] = useState({ open: false, document: null });
  const [signatureStatuses, setSignatureStatuses] = useState({});
  const [verifyDialog, setVerifyDialog] = useState({ open: false, document: null });
  const [verificationResult, setVerificationResult] = useState(null);
  const token = localStorage.getItem('token');
  const [loadingSignatures, setLoadingSignatures] = useState(false);
  const [viewDialog, setViewDialog] = useState({
    open: false,
    document: null,
    employeeCopy: null
  });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Eroare la obținerea documentelor');
      }

      const data = await response.json();
      console.log('Documents data:', data);
      setError(null);
      setDocuments(data);
    } catch (error) {
      setError(error.message);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseUploadDialog = () => {
    setOpenUploadDialog(false);
    setUploadError(null);
    setUploadData({ title: '', description: '', file: null });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.file || !uploadData.title) {
      setUploadError('Titlul și fișierul sunt obligatorii');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', uploadData.file);
      formData.append('title', uploadData.title);
      formData.append('description', uploadData.description);

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Eroare la încărcarea documentului');
      }

      const document = await response.json();
      setDocuments([document, ...documents]);
      handleCloseUploadDialog();
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Verificăm mărimea fișierului (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('Fișierul este prea mare. Limita este de 10MB.');
        return;
      }

      // Verificăm tipul fișierului - doar PDF permis
      if (file.type !== 'application/pdf') {
        setUploadError('Sunt acceptate doar fișiere PDF.');
        setUploadData({ ...uploadData, file: null });
        return;
      }

      setUploadError(null);
      setUploadData({ ...uploadData, file });
    }
  };

  const handleDeleteClick = (document) => {
    setDeleteDialog({
      open: true,
      document: document,
      isBulk: false
    });
  };

  const handleBulkDeleteClick = () => {
    setDeleteDialog({
      open: true,
      document: null,
      isBulk: true
    });
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      open: false,
      document: null,
      isBulk: false
    });
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/documents/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Eroare la ștergerea documentului');
      }

      setDocuments(documents.filter(doc => doc._id !== id));
      handleDeleteCancel();
      enqueueSnackbar('Documentul a fost șters cu succes', { variant: 'success' });
    } catch (error) {
      setError(error.message);
      enqueueSnackbar(error.message, { variant: 'error' });
    }
  };

  const handleDownload = async (doc) => {
    try {
      setDownloading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/documents/download/${doc._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Eroare la descărcarea documentului');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Eroare la descărcarea documentului');
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleSendToSign = async (documentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/documents/${documentId}/send-to-sign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Eroare la trimiterea documentului spre semnare');
      }

      const result = await response.json();
      setSuccessMessage(`Documentul a fost trimis spre semnare la ${result.sentCount} angajați`);
      setSendToSignDialog({ open: false, document: null });

      // Reîmprospătăm lista de documente
      const updatedDocumentsResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!updatedDocumentsResponse.ok) {
        throw new Error('Eroare la obținerea documentelor actualizate');
      }

      const updatedDocuments = await updatedDocumentsResponse.json();
      setDocuments(updatedDocuments);

      // Actualizăm dialogul de status dacă este deschis
      if (statusDialog.open && statusDialog.document) {
        const updatedDocument = updatedDocuments.find(doc => doc._id === statusDialog.document._id);
        if (updatedDocument) {
          setStatusDialog({
            open: true,
            document: updatedDocument
          });
        }
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSignDialogClose = () => {
    setSignDialog({
      open: false,
      document: null
    });
  };

  const handleSendToSignConfirm = () => {
    if (signDialog.document) {
      handleSendToSign(signDialog.document._id);
    }
    handleSignDialogClose();
  };

  const handleViewStatus = async (doc) => {
    setStatusDialog({
      open: true,
      document: doc
    });
    
    // Verificăm toate semnăturile când se deschide dialogul
    const signedCopies = doc.employeeCopies.filter(copy => copy.status === 'signed');
    await Promise.all(
      signedCopies.map(async (copy) => {
        try {
          await verifySignature(doc._id, copy.employee);
        } catch (error) {
          console.error('Error verifying signature:', error);
        }
      })
    );
  };

  const handleStatusDialogClose = () => {
    setStatusDialog({
      open: false,
      document: null
    });
  };

  const handleVerifyClick = async (copy) => {
    try {
      setVerifyDialog({
        open: true,
        document: statusDialog.document,
        employeeCopy: copy
      });
      setVerificationResult(null);

      const result = await verifySignature(statusDialog.document._id, copy.employee);
      
      if (!result) {
        throw new Error('Nu s-a putut verifica semnătura');
      }

      setVerificationResult({
        isValid: result.isValid,
        error: result.error || result.message,
        documentHash: result.details?.documentHash,
        signedAt: copy.signedAt || result.details?.signedAt,
        signatureTimestamp: result.details?.signatureTimestamp,
        employeeName: copy.employeeName,
        employeeEmail: copy.employeeEmail,
        organizationName: statusDialog.document.organizationName
      });
    } catch (error) {
      console.error('Error verifying signature:', error);
      setVerificationResult({
        isValid: false,
        error: error.message || 'Eroare la verificarea semnăturii',
        employeeName: copy.employeeName,
        employeeEmail: copy.employeeEmail,
        organizationName: statusDialog.document.organizationName,
        signedAt: copy.signedAt
      });
    }
  };

  const getStatusChipProps = (document, copy) => {
    const signatureStatus = signatureStatuses[`${document._id}_${copy.employee}`];
    console.log('Getting status chip props for', copy.employeeName, ':', signatureStatus);
    
    if (copy.status === 'pending') {
      return {
        label: 'În așteptare',
        color: 'warning'
      };
    }
    
    if (copy.status === 'signed') {
      if (signatureStatus === undefined) {
        return {
          label: 'Verificare...',
          color: 'default'
        };
      }
      
      return signatureStatus ? {
        label: 'Semnat și Valid',
        color: 'success'
      } : {
        label: 'Semnat dar Invalid',
        color: 'error'
      };
    }
    
    return {
      label: 'Netrimis',
      color: 'default'
    };
  };

  const handleViewDialogClose = () => {
    setViewDialog({
      open: false,
      document: null,
      employeeCopy: null
    });
  };

  const handleSelectDocument = (documentId) => {
    setSelectedDocuments(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  };

  const handleSelectAllDocuments = (event) => {
    if (event.target.checked) {
      setSelectedDocuments(documents.map(doc => doc._id));
    } else {
      setSelectedDocuments([]);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/documents/bulk-delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documentIds: selectedDocuments })
      });

      if (!response.ok) {
        throw new Error('Eroare la ștergerea documentelor');
      }

      const result = await response.json();
      setDocuments(documents.filter(doc => !selectedDocuments.includes(doc._id)));
      setSelectedDocuments([]);
      handleDeleteCancel();
      enqueueSnackbar(`${result.deletedCount} documente au fost șterse cu succes`, { variant: 'success' });
    } catch (error) {
      setError(error.message);
      enqueueSnackbar(error.message, { variant: 'error' });
    }
  };

  const handleViewDocument = (document, employeeCopy) => {
    console.log('Selected employee copy:', employeeCopy);
    setSelectedDocument({
      ...document,
      employeeCopies: [employeeCopy]
    });
    setViewDialogOpen(true);
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
      <Box sx={{ mb: 4 }}>
        <OrgAdminPageHeader organizationName={organizationName} pageName="Documente" />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleBulkDeleteClick}
          disabled={selectedDocuments.length === 0}
        >
          Șterge ({selectedDocuments.length})
        </Button>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setOpenUploadDialog(true)}
          sx={{
            background: 'linear-gradient(195deg, rgb(73, 163, 241), rgb(26, 115, 232))',
            '&:hover': {
              background: 'linear-gradient(195deg, rgb(66, 147, 217), rgb(23, 103, 209))'
            }
          }}
        >
          Încarcă Document
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'rgb(248, 249, 250)' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedDocuments.length > 0 && selectedDocuments.length < documents.length}
                  checked={documents.length > 0 && selectedDocuments.length === documents.length}
                  onChange={handleSelectAllDocuments}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Titlu</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Descriere</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Nume Fișier</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Tip Fișier</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Mărime</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Data Încărcării</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status Semnături</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Acțiuni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    Nu există documente încărcate
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc._id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedDocuments.includes(doc._id)}
                      onChange={() => handleSelectDocument(doc._id)}
                    />
                  </TableCell>
                  <TableCell>{doc.title}</TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        maxWidth: 250,
                        color: doc.description ? 'text.primary' : 'text.secondary',
                        fontStyle: doc.description ? 'normal' : 'italic'
                      }}
                    >
                      {doc.description || 'Fără descriere'}
                    </Typography>
                  </TableCell>
                  <TableCell>{doc.originalName}</TableCell>
                  <TableCell>{doc.fileType}</TableCell>
                  <TableCell>{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</TableCell>
                  <TableCell>
                    {doc.uploadedAt ? 
                      new Date(doc.uploadedAt).toLocaleDateString('ro-RO', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      }) : 
                      'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    {doc.employeeCopies ? (
                      <>
                        {doc.employeeCopies.filter(copy => copy.status === 'signed').length}/
                        {doc.employeeCopies.length} semnate
                      </>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="Vezi status semnături">
                        <IconButton 
                          onClick={() => handleViewStatus(doc)}
                          color="info"
                        >
                          <InfoIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Trimite la semnat">
                        <IconButton 
                          onClick={() => setSendToSignDialog({ open: true, document: doc })}
                          color="primary"
                        >
                          <SendIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Descarcă">
                        <IconButton onClick={() => handleDownload(doc)}>
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Șterge">
                        <IconButton 
                          color="error" 
                          onClick={() => setDeleteDialog({ open: true, document: doc })}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openUploadDialog} onClose={handleCloseUploadDialog}>
        <DialogTitle>Încarcă Document</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleUpload} sx={{ mt: 2 }}>
            {uploadError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {uploadError}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Titlu"
              required
              value={uploadData.title}
              onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Descriere"
              multiline
              rows={4}
              value={uploadData.description}
              onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
              sx={{ mb: 2 }}
            />
            <input
              type="file"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="file-input"
              accept=".pdf,application/pdf"
            />
            <label htmlFor="file-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                fullWidth
              >
                {uploadData.file ? uploadData.file.name : 'Selectează Fișier PDF'}
              </Button>
            </label>
            {!uploadData.file && (
              <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                Doar fișiere PDF sunt acceptate
              </Typography>
            )}
            {uploadData.file && (
              <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                Mărime: {(uploadData.file.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog}>Anulează</Button>
          <Button 
            onClick={handleUpload} 
            variant="contained"
            disabled={!uploadData.file || !uploadData.title}
          >
            Încarcă
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>
          {deleteDialog.isBulk ? 'Confirmare ștergere în masă' : 'Confirmare ștergere'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteDialog.isBulk ? (
              <>
                Sunteți sigur că doriți să ștergeți {selectedDocuments.length} documente?
                <br />
                <strong>Atenție:</strong> Această acțiune va șterge și documentele semnate, precum și toate copiile acestora de la angajați.
              </>
            ) : (
              <>
                Sunteți sigur că doriți să ștergeți documentul "{deleteDialog.document?.title}"?
                <br />
                <strong>Atenție:</strong> Această acțiune va șterge și documentul semnat, precum și toate copiile acestuia de la angajați.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Anulează</Button>
          <Button
            onClick={() => deleteDialog.isBulk ? handleBulkDelete() : handleDelete(deleteDialog.document._id)}
            color="error"
            variant="contained"
          >
            Șterge
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={signDialog.open}
        onClose={handleSignDialogClose}
      >
        <DialogTitle>Confirmare trimitere la semnat</DialogTitle>
        <DialogContent>
          <Typography>
            Sigur doriți să trimiteți documentul "{signDialog.document?.title}" spre semnare?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSignDialogClose}>Anulează</Button>
          <Button
            onClick={handleSendToSignConfirm}
            variant="contained"
            color="primary"
          >
            Trimite
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={sendToSignDialog.open}
        onClose={() => setSendToSignDialog({ open: false, document: null })}
      >
        <DialogTitle>Confirmare trimitere la semnat</DialogTitle>
        <DialogContent>
          <Typography>
            Sigur doriți să trimiteți documentul "{sendToSignDialog.document?.title}" spre semnare?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Email-urile vor fi trimise doar către angajații care au acest document asociat.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendToSignDialog({ open: false, document: null })}>
            Anulează
          </Button>
          <Button
            onClick={() => handleSendToSign(sendToSignDialog.document?._id)}
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
          >
            Trimite
          </Button>
        </DialogActions>
      </Dialog>

      <SignatureStatusDialog
        open={statusDialog.open}
        document={statusDialog.document}
        onClose={handleStatusDialogClose}
        onVerifyClick={handleVerifyClick}
        onViewDocument={handleViewDocument}
      />

      <Dialog 
        open={verifyDialog.open} 
        onClose={() => setVerifyDialog({ open: false, document: null, employeeCopy: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Verificare Semnătură Electronică
        </DialogTitle>
        <DialogContent>
          {verificationResult ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                {verificationResult.isValid ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
                    <VerifiedUserIcon sx={{ mr: 1 }} />
                    Semnătură Validă
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
                    <ErrorIcon sx={{ mr: 1 }} />
                    Semnătură Invalidă
                  </Box>
                )}
              </Typography>
              
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Detalii Semnătură:
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Semnatar"
                    secondary={verificationResult.employeeName}
                  />
                </ListItem>
                {verificationResult.employeeEmail && (
                  <ListItem>
                    <ListItemText 
                      primary="Email"
                      secondary={verificationResult.employeeEmail}
                    />
                  </ListItem>
                )}
                {verificationResult.organizationName && (
                  <ListItem>
                    <ListItemText 
                      primary="Organizație"
                      secondary={verificationResult.organizationName}
                    />
                  </ListItem>
                )}
                {verificationResult.signedAt && (
                  <ListItem>
                    <ListItemText 
                      primary="Data Semnării"
                      secondary={new Date(verificationResult.signedAt).toLocaleString('ro-RO')}
                    />
                  </ListItem>
                )}
                {verificationResult.signatureTimestamp && verificationResult.signatureTimestamp !== verificationResult.signedAt && (
                  <ListItem>
                    <ListItemText 
                      primary="Timestamp Semnătură"
                      secondary={new Date(verificationResult.signatureTimestamp).toLocaleString('ro-RO')}
                    />
                  </ListItem>
                )}
                {verificationResult.documentHash && (
                  <ListItem>
                    <ListItemText 
                      primary="Hash Document"
                      secondary={
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace',
                            wordBreak: 'break-all'
                          }}
                        >
                          {verificationResult.documentHash}
                        </Typography>
                      }
                    />
                  </ListItem>
                )}
              </List>

              {!verificationResult.isValid && verificationResult.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {verificationResult.error}
                </Alert>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setVerifyDialog({ open: false, document: null, employeeCopy: null });
              setVerificationResult(null);
            }}
          >
            Închide
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={viewDialog.open}
        onClose={handleViewDialogClose}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {viewDialog.document?.title}
        </DialogTitle>
        <DialogContent>
          {viewDialog.document ? (
            viewDialog.document.employeeCopies?.filter(copy => copy.status === 'signed').length > 0 ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Semnături disponibile:
                </Typography>
                <List>
                  {viewDialog.document.employeeCopies
                    .filter(copy => copy.status === 'signed')
                    .map((copy, index) => (
                      <ListItem
                        key={index}
                        secondaryAction={
                          <Button
                            variant="outlined"
                            onClick={() => {
                              console.log('Selected employee copy:', copy);
                              setViewDialog(prev => ({
                                ...prev,
                                employeeCopy: {
                                  employee: copy.employee,
                                  employeeName: copy.employeeName,
                                  signature: {
                                    _id: copy._id,
                                    digitalSignature: copy.digitalSignature,
                                    documentHash: copy.documentHash,
                                    publicKey: copy.publicKey,
                                    signedAt: copy.signedAt,
                                    signatureTimestamp: copy.signatureTimestamp
                                  }
                                }
                              }));
                            }}
                          >
                            Vezi document
                          </Button>
                        }
                      >
                        <ListItemText
                          primary={copy.employeeName}
                          secondary={`Semnat la: ${new Date(copy.signedAt).toLocaleString('ro-RO')}`}
                        />
                      </ListItem>
                    ))}
                </List>
                {viewDialog.employeeCopy && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Document semnat de {viewDialog.employeeCopy.employeeName}:
                    </Typography>
                    <DocumentViewer 
                      document={viewDialog.document}
                      employeeCopy={viewDialog.employeeCopy}
                    />
                  </Box>
                )}
              </Box>
            ) : (
              <Alert severity="info">
                Acest document nu are încă semnături.
              </Alert>
            )
          ) : (
            <CircularProgress />
          )}
        </DialogContent>
        <DialogActions>
          {viewDialog.employeeCopy && (
            <Button 
              onClick={() => setViewDialog(prev => ({ ...prev, employeeCopy: null }))}
              sx={{ mr: 'auto' }}
            >
              Înapoi la lista de semnături
            </Button>
          )}
          <Button onClick={handleViewDialogClose}>Închide</Button>
        </DialogActions>
      </Dialog>

      <DocumentViewer
        document={selectedDocument}
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setSelectedDocument(null);
        }}
      />
    </Container>
  );
};

export default DocumentManagement; 