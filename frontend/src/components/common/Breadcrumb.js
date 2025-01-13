import React from 'react';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

const Breadcrumb = ({ items, sx = {} }) => {
  return (
    <Breadcrumbs 
      separator={<NavigateNextIcon fontSize="small" />} 
      aria-label="breadcrumb"
      sx={sx}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return isLast ? (
          <Typography 
            key={item.text} 
            color="text.primary"
            sx={{ fontSize: '0.875rem' }}
          >
            {item.text}
          </Typography>
        ) : (
          <Link
            key={item.text}
            component={RouterLink}
            to={item.href}
            color="inherit"
            sx={{ 
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline'
              },
              fontSize: '0.875rem'
            }}
          >
            {item.text}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
};

export default Breadcrumb; 