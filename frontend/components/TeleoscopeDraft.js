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
        backgroundColor: "white"
      }}
      variant="outlined"
      className="drag-handle"
    >
      <FlareIcon />
    </IconButton>
    
    
  );
}