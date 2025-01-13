import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Tooltip,
  IconButton,
  CircularProgress,
  Box,
  Divider
} from '@mui/material';
import {
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as ValidIcon,
  Cancel as InvalidIcon,
  Person as PersonIcon,
  Description as DocumentIcon
} from '@mui/icons-material';

function EmployeeDocuments({ employee, documents, open, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDoc, setExpandedDoc] = useState(null);

  React.useEffect(() => {
    setLoading(false);
  }, [open]);

  const handleDownload = async (doc) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/documents/employee/${employee.id}/${doc.documentId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Eroare la descărcarea documentului');
      }

      const data = await response.json();
      
      // Creăm un blob din conținutul base64
      const blob = new Blob(
        [Uint8Array.from(atob(data.fileContent), c => c.charCodeAt(0))],
        { type: data.fileType }
      );

      // Creăm un URL pentru blob
      const url = window.URL.createObjectURL(blob);

      // Creăm un element anchor invizibil
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = data.fileName;

      // Adăugăm elementul la DOM, declanșăm click și îl ștergem
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Eroare la descărcare:', error);
      setError('Eroare la descărcarea documentului');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: 'primary.main', 
        color: 'white',
        p: 3,
      }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <PersonIcon />
          <Typography variant="h5" component="span">
            {employee.firstName} {employee.lastName}
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ p: 2 }}>
            {error}
          </Typography>
        ) : documents.length === 0 ? (
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            p={4}
            sx={{ color: 'text.secondary' }}
          >
            <DocumentIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6">Nu există documente</Typography>
          </Box>
        ) : (
          <List sx={{ width: '100%', mt: 2 }}>
            {documents.map((doc) => (
              <Accordion 
                key={doc.id}
                expanded={expandedDoc === doc.id}
                onChange={(e, isExpanded) => setExpandedDoc(isExpanded ? doc.id : null)}
                sx={{
                  mb: 2,
                  '&:before': { display: 'none' },
                  boxShadow: 'none',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <AccordionSummary 
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <Stack 
                    direction="row" 
                    spacing={2} 
                    alignItems="center" 
                    sx={{ width: '100%' }}
                  >
                    <DocumentIcon color="primary" />
                    <Box flexGrow={1}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {doc.document?.title || 'Document fără titlu'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Adăugat la: {new Date(doc.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Chip 
                        label={doc.status}
                        size="small"
                        color={getStatusColor(doc.status)}
                        sx={{ minWidth: 90 }}
                      />
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(doc);
                        }}
                        sx={{ 
                          color: 'primary.main',
                          '&:hover': { 
                            bgcolor: 'primary.light',
                            color: 'white'
                          }
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Stack>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: 'background.default', p: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Semnături
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  {doc.document?.signatures?.length > 0 ? (
                    <List disablePadding>
                      {doc.document.signatures.map((sig) => (
                        <ListItem 
                          key={sig.id}
                          sx={{
                            bgcolor: 'background.paper',
                            borderRadius: 2,
                            mb: 1,
                            border: '1px solid',
                            borderColor: 'divider'
                          }}
                        >
                          <ListItemIcon>
                            <PersonIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="body2" fontWeight="medium">
                                  {sig.signerInfo?.email}
                                </Typography>
                                <Tooltip title={sig.isValid ? "Semnătură validă" : "Semnătură invalidă"}>
                                  {sig.isValid ? 
                                    <ValidIcon color="success" fontSize="small" /> : 
                                    <InvalidIcon color="error" fontSize="small" />
                                  }
                                </Tooltip>
                              </Stack>
                            }
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                <Typography variant="caption" display="block" color="text.secondary">
                                  {sig.signerInfo?.organizationName}
                                </Typography>
                                <Typography variant="caption" display="block" color="text.secondary">
                                  Semnat la: {new Date(sig.timestamp).toLocaleString()}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" align="center">
                      Acest document nu are semnături
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, bgcolor: 'background.default' }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          Închide
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EmployeeDocuments; 