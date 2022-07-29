import * as React from 'react';

// mui
import FlareIcon from '@mui/icons-material/Flare';
import IconButton from '@mui/material/IconButton';


export default function TeleoscopeDraft() {
  return (
    <IconButton 
      color="secondary"
      sx={{
        boxShadow: '3',

      }}
      variant="outlined"
    >
      <FlareIcon />
    </IconButton>
    
    
  );
}