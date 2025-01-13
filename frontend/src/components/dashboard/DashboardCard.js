import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
} from '@mui/material';
import { ArrowForward as ArrowIcon, Add as AddIcon } from '@mui/icons-material';

const DashboardCard = ({ title, icon, count, action, onClick, onAddClick }) => {
  return (
    <Card 
      sx={{ 
        height: '100%',
        background: 'white',
        borderRadius: 2,
        boxShadow: '0 0 2rem 0 rgba(136, 152, 170, 0.15)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: '0 1rem 3rem rgba(0,0,0,.175)'
        }
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box 
            sx={{ 
              p: 2,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'white',
              mr: 2,
              boxShadow: '0 4px 20px 0 rgba(0,0,0,.14), 0 7px 10px -5px rgba(64,64,64,.4)'
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            {count !== undefined && (
              <Typography variant="h4" component="div" fontWeight="medium">
                {count}
              </Typography>
            )}
          </Box>
          {title === "Organizații" && (
            <IconButton 
              size="small"
              color="primary"
              sx={{ 
                bgcolor: 'rgba(0, 0, 0, 0.04)',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.08)'
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                onAddClick && onAddClick();
              }}
            >
              <AddIcon />
            </IconButton>
          )}
        </Box>
        
        {action && (
          <Box 
            sx={{ 
              pt: 2,
              mt: 2,
              borderTop: '1px solid rgba(0, 0, 0, 0.12)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ flexGrow: 1 }}
            >
              {action}
            </Typography>
            <IconButton 
              size="small"
              color="primary"
              sx={{ 
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              <ArrowIcon />
            </IconButton>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardCard; 