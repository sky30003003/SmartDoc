import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Grid,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Security as SecurityIcon,
  Verified as VerifiedIcon,
  Gavel as GavelIcon,
  EuroSymbol as EuroIcon,
  CheckCircle as CheckCircleIcon,
  Architecture as ArchitectureIcon,
  RadioButtonUnchecked as SimpleIcon,
  Adjust as AdvancedIcon,
  LensBlur as QualifiedIcon
} from '@mui/icons-material';

const DigitalSignatureInfo = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Semnătura Electronică în SmartDoc
      </Typography>

      <Grid container spacing={4}>
        {/* Secțiunea Caracteristici de Securitate */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <SecurityIcon sx={{ mr: 1 }} />
              Caracteristici de Securitate
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <VerifiedIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          Autenticitate
                        </Typography>
                      }
                      secondary="Verificare criptografică a identității semnatarului"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <VerifiedIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          Integritate
                        </Typography>
                      }
                      secondary="Detectarea oricărei modificări a documentului după semnare"
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <VerifiedIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          Non-Repudiere
                        </Typography>
                      }
                      secondary="Semnatarul nu poate nega ulterior semnarea documentului"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <VerifiedIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          Validare Temporală
                        </Typography>
                      }
                      secondary="Timestamp criptografic pentru momentul semnării"
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Secțiunea Implementare */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <ArchitectureIcon sx={{ mr: 1 }} />
              Implementare Tehnică
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          Criptografie Asimetrică
                        </Typography>
                      }
                      secondary="Utilizăm perechi de chei publice/private pentru semnare și verificare, asigurând autenticitatea și non-repudierea"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          Hash-uri Criptografice
                        </Typography>
                      }
                      secondary="Folosim SHA-256 pentru a genera amprente unice ale documentelor, garantând integritatea conținutului"
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          Timestamp Criptografic
                        </Typography>
                      }
                      secondary="Fiecare semnătură include un timestamp securizat pentru a dovedi momentul exact al semnării"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          Ștampilă Electronică (Watermark)
                        </Typography>
                      }
                      secondary="Element vizual care oferă confirmarea imediată a autenticității documentului, afișând numele semnatarului, organizația, momentul semnării și un identificator unic pentru trasabilitate"
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Secțiunea Tipuri de Semnături */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <VerifiedIcon sx={{ mr: 1 }} />
              Tipuri de Semnături Electronice
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3, ml: 4 }}>
              în conformitate cu Legea 455/2001 și Regulamentul eIDAS (UE) 910/2014
            </Typography>
            
            <Stepper orientation="vertical">
              <Step active={true}>
                <StepLabel
                  icon={<QualifiedIcon />}
                  optional={
                    <Typography variant="caption">
                      Nivel Maxim de Securitate
                    </Typography>
                  }
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Semnătură Electronică Calificată
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    • Bazată pe un certificat calificat emis de un prestator de servicii de încredere calificat
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    • Creată prin intermediul unui dispozitiv securizat de creare a semnăturii (QSCD)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Echivalentă juridic cu semnătura olografă
                  </Typography>
                </StepContent>
              </Step>

              <Step active={true}>
                <StepLabel
                  icon={<AdvancedIcon color="primary" />}
                  optional={
                    <Typography variant="caption" color="primary">
                      Implementarea SmartDoc
                    </Typography>
                  }
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Semnătură Electronică Avansată
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="success.main" paragraph>
                    • Face legătura unică cu semnatarul
                  </Typography>
                  <Typography variant="body2" color="success.main" paragraph>
                    • Permite identificarea semnatarului
                  </Typography>
                  <Typography variant="body2" color="success.main" paragraph>
                    • Creată folosind date de creare aflate sub controlul exclusiv al semnatarului
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    • Permite detectarea oricărei modificări ulterioare a datelor semnate
                  </Typography>
                </StepContent>
              </Step>

              <Step active={true}>
                <StepLabel
                  icon={<SimpleIcon />}
                  optional={
                    <Typography variant="caption">
                      Nivel Basic de Securitate
                    </Typography>
                  }
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Semnătură Electronică Simplă
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="success.main" paragraph>
                    • Date în format electronic atașate sau asociate logic cu alte date în format electronic
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    • Exemple: semnătura scanată, numele la sfârșitul unui email
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Nivel minim de securitate și validitate juridică
                  </Typography>
                </StepContent>
              </Step>
            </Stepper>
          </Paper>
        </Grid>

        {/* Secțiunea Conformitate Legislativă */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <GavelIcon sx={{ mr: 1 }} />
                Conformitate cu Legislația Română
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Typography variant="body1">
                        Legea nr. 455/2001 privind semnătura electronică
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Publicată în Monitorul Oficial nr. 429 din 31 iulie 2001
                        Republicată în Monitorul Oficial nr. 316 din 30 aprilie 2014
                      </Typography>
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Typography variant="body1">
                        Legea nr. 451/2004 privind marca temporală
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Publicată în Monitorul Oficial nr. 1021 din 5 noiembrie 2004
                      </Typography>
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Typography variant="body1">
                        Legea nr. 362/2018 privind asigurarea unui nivel comun ridicat de securitate a rețelelor și sistemelor informatice
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Publicată în Monitorul Oficial nr. 21 din 9 ianuarie 2019
                      </Typography>
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <EuroIcon sx={{ mr: 1 }} />
                Conformitate cu Legislația UE
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Typography variant="body1">
                        Regulamentul (UE) nr. 910/2014 (eIDAS)
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Publicat în Jurnalul Oficial al UE L257/73 din 28.8.2014
                        Privind identificarea electronică și serviciile de încredere pentru tranzacțiile electronice pe piața internă
                      </Typography>
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Typography variant="body1">
                        Regulamentul (UE) 2016/679 (GDPR)
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Publicat în Jurnalul Oficial al UE L119/1 din 4.5.2016
                        Privind protecția persoanelor fizice în ceea ce privește prelucrarea datelor cu caracter personal
                      </Typography>
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Typography variant="body1">
                        Regulamentul de punere în aplicare (UE) 2015/1502
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Publicat în Jurnalul Oficial al UE L235/7 din 9.9.2015
                        Privind stabilirea unor specificații și proceduri tehnice minime pentru nivelurile de asigurare ale mijloacelor de identificare electronică
                      </Typography>
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DigitalSignatureInfo; 