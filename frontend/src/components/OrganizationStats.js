import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Grid,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Description as DescriptionIcon,
  People as PeopleIcon,
  DocumentScanner as DocumentScannerIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';

const StatCard = ({ icon, title, value, color }) => (
  <Paper
    elevation={2}
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      bgcolor: `${color}.light`,
      color: `${color}.dark`,
      borderRadius: 2
    }}
  >
    <Box
      sx={{
        p: 1,
        borderRadius: 1,
        bgcolor: `${color}.dark`,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="body2" color={`${color}.dark`}>
        {title}
      </Typography>
      <Typography variant="h5" fontWeight="bold">
        {value}
      </Typography>
    </Box>
  </Paper>
);

const OrganizationStats = ({ organization }) => {
  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Angajați</Typography>
              </Box>
              <Typography variant="h4">{organization.employeeCount || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <DescriptionIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Documente</Typography>
                </Box>
              </Box>
              <Typography variant="h4">{organization.documentCount || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OrganizationStats; 