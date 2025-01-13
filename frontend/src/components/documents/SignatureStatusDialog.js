import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VerifiedUser as VerifiedUserIcon
} from '@mui/icons-material';

const SignatureStatusDialog = ({ open, document, onClose, onVerifyClick, onViewDocument }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Status Semnături - {document?.title}
      </DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1" gutterBottom>
          {document?.signatureSettings?.printSignature ? 'Cu ștampilă' : 'Fără ștampilă'}
        </Typography>
        <List>
          {document?.employeeCopies?.map((copy) => (
            <ListItem
              key={copy.employee}
              secondaryAction={
                <Box>
                  {copy.status === 'signed' && (
                    <>
                      <Tooltip title="Vizualizează document semnat">
                        <IconButton
                          edge="end"
                          onClick={() => onViewDocument(document, copy)}
                          sx={{ mr: 1 }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Verifică semnătura">
                        <IconButton
                          edge="end"
                          onClick={() => onVerifyClick(copy)}
                          color="success"
                          sx={{
                            '& .MuiSvgIcon-root': {
                              color: 'success.main'
                            }
                          }}
                        >
                          <VerifiedUserIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Box>
              }
            >
              <ListItemText
                primary={copy.employeeName}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.secondary">
                      {copy.status === 'signed' 
                        ? `Semnat la: ${new Date(copy.signedAt).toLocaleString('ro-RO')}`
                        : 'În așteptare'
                      }
                    </Typography>
                    <br />
                    <Chip
                      label={copy.status === 'signed' ? 'Semnat' : 'În așteptare'}
                      color={copy.status === 'signed' ? 'success' : 'warning'}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Închide</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SignatureStatusDialog; 