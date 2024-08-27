import { useState } from 'react';
import { Menu, MenuItem } from '@mui/material';

function ContextMenuExample() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [divData, setDivData] = useState(null);

  const handleContextMenu = (event) => {
    event.preventDefault();
    // Identify the div element under the click
    const clickedDiv = event.target.closest('div');
    
    if (clickedDiv) {
      // Extract data (for example, from a data-* attribute)
      const data = clickedDiv.getAttribute('data-info');
      setDivData(data);
    }

    // Open the context menu
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div onContextMenu={handleContextMenu} style={{ cursor: 'context-menu' }}>
      <div data-info="Data 1">Right-click on this div</div>
      <div data-info="Data 2">Right-click on this other div</div>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={handleClose}>Option 1</MenuItem>
        <MenuItem onClick={handleClose}>Option 2</MenuItem>
      </Menu>

      {divData && <p>Data from clicked div: {divData}</p>}
    </div>
  );
}

export default ContextMenuExample;
