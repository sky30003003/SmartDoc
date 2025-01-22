import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  List, 
  ListItem, 
  ListItemText, 
  IconButton, 
  Tooltip, 
  Typography, 
  Box, 
  Divider,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  VerifiedUser, 
  ErrorOutline, 
  HourglassEmpty, 
  Visibility, 
  Close,
  CheckCircle as CheckCircleIcon,
  Circle as CircleIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Person as PersonIcon,
  Group as GroupIcon
} from '@mui/icons-material';

const SignatureStatusDialog = ({ open, onClose, document, onVerifyClick, onViewDocument }) => {
  const [verificationDetails, setVerificationDetails] = useState(null);
  const [verifiedCopyId, setVerifiedCopyId] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVerifyClick = async (documentId, signatureId, copy) => {
    try {
      setLoading(true);
      console.log('Requesting verification for:', { documentId, signatureId });
      const result = await onVerifyClick(documentId, signatureId);
      console.log('Received verification result:', result);
      
      if (result && result.isValid !== undefined) {
        setVerificationDetails(result);
        setVerifiedCopyId(copy._id);
      } else {
        console.error('Invalid verification result received:', result);
      }
    } catch (error) {
      console.error('Error verifying signature:', error);
      setVerificationDetails(null);
      setVerifiedCopyId(null);
    } finally {
      setLoading(false);
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'org_admin':
        return 'Administrator';
      case 'collaborator':
        return 'Colaborator';
      case 'employee':
        return 'Angajați';
      default:
        return role;
    }
  };

  const SignatureProgress = () => {
    if (!document?.signatureProgress) {
      return null;
    }

    const totalSteps = document.signatureProgress.totalSteps || 0;
    const currentStep = document.signatureProgress.currentStep || 0;
    const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

    return (
      <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          Progres Semnături
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {currentStep} din {totalSteps} semnături colectate ({Math.round(progress)}%)
        </Typography>
        <Box sx={{ 
          width: '100%', 
          height: 8, 
          bgcolor: 'grey.200', 
          borderRadius: 4,
          overflow: 'hidden',
          position: 'relative'
        }}>
          <Box sx={{ 
            width: `${progress}%`, 
            height: '100%', 
            bgcolor: progress === 100 ? 'success.main' : 'primary.main',
            transition: 'width 0.5s ease-in-out'
          }} />
        </Box>
      </Box>
    );
  };

  const SignatureConfigList = () => {
    if (!document?.signatureConfig) {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          Acest document nu are configurate semnături.
        </Alert>
      );
    }

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Configurație Semnături
        </Typography>
        <Paper variant="outlined" sx={{ p: 1 }}>
          {document.signatureConfig
            .sort((a, b) => a.order - b.order)
            .map((config, index) => {
              const isCompleted = document.signatureProgress?.signatures?.some(
                sig => sig.signedBy.role === config.role
              );
              const signature = document.signatureProgress?.signatures?.find(
                sig => sig.signedBy.role === config.role
              );

              return (
                <Box key={index} sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  p: 1,
                  borderRadius: 1,
                  bgcolor: isCompleted ? 'success.light' : 'grey.100',
                  mb: 1,
                  '&:last-child': { mb: 0 }
                }}>
                  {config.role === 'org_admin' && <AdminPanelSettingsIcon sx={{ mr: 1 }} />}
                  {config.role === 'collaborator' && <PersonIcon sx={{ mr: 1 }} />}
                  {config.role === 'employee' && <GroupIcon sx={{ mr: 1 }} />}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1">
                      {getRoleName(config.role)}
                    </Typography>
                    {isCompleted && signature && (
                      <Typography variant="caption" color="text.secondary">
                        Semnat la {new Date(signature.signedAt).toLocaleString('ro-RO')}
                      </Typography>
                    )}
                  </Box>
                  {isCompleted ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <CircleIcon sx={{ color: 'grey.400' }} />
                  )}
                </Box>
              );
            })}
        </Paper>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
        Status Semnături - {document?.title}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        )}

        {!document ? (
          <Alert severity="info">
            Nu există informații despre document.
          </Alert>
        ) : (
          <>
            <SignatureProgress />
            <SignatureConfigList />

            <Typography variant="h6" gutterBottom>
              Semnături Colectate
            </Typography>

            {document.signatureProgress?.signatures?.length > 0 ? (
              <List>
                {document.signatureProgress.signatures.map((signature) => (
                  <React.Fragment key={signature._id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {signature.signedBy.role === 'org_admin' && <AdminPanelSettingsIcon sx={{ mr: 1, fontSize: 20 }} />}
                            {signature.signedBy.role === 'collaborator' && <PersonIcon sx={{ mr: 1, fontSize: 20 }} />}
                            {signature.signedBy.role === 'employee' && <GroupIcon sx={{ mr: 1, fontSize: 20 }} />}
                            <Typography>
                              {signature.signedBy.name} ({getRoleName(signature.signedBy.role)})
                            </Typography>
                          </Box>
                        }
                        secondary={`Semnat la: ${new Date(signature.signedAt).toLocaleString('ro-RO')}`}
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Vezi documentul">
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => onViewDocument(document)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Verifică semnătura">
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => handleVerifyClick(document._id, signature._id, signature)}
                          >
                            <VerifiedUser />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItem>
                    {verificationDetails && verifiedCopyId === signature._id && (
                      <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mx: 2, mb: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Detalii Verificare Semnătură:
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          Semnat de: {verificationDetails.signedBy.name}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          Rol: {verificationDetails.signedBy.role}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          Organizație: {verificationDetails.signedBy.organization}
                        </Typography>
                        {verificationDetails.signedBy.identityNumber && (
                          <Typography variant="body2" gutterBottom>
                            CNP/CUI: {verificationDetails.signedBy.identityNumber}
                          </Typography>
                        )}
                        <Typography variant="body2" gutterBottom>
                          Data semnării: {new Date(verificationDetails.signedAt).toLocaleString('ro-RO')}
                        </Typography>
                        <Typography variant="body2" gutterBottom sx={{ wordBreak: 'break-all' }}>
                          Hash document: {verificationDetails.documentHash}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: verificationDetails.isValid ? 'success.main' : 'error.main',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          {verificationDetails.isValid ? (
                            <CheckCircleIcon fontSize="small" />
                          ) : (
                            <ErrorOutline fontSize="small" />
                          )}
                          Status verificare: {verificationDetails.isValid ? 'Valid' : 'Invalid'}
                        </Typography>
                        {verificationDetails.warning && (
                          <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                            Avertisment: {verificationDetails.warning}
                          </Typography>
                        )}
                      </Box>
                    )}
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Alert severity="info">
                Acest document nu are încă semnături colectate.
              </Alert>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SignatureStatusDialog; 