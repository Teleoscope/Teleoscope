import React from "react";

// mui
import Grid from '@mui/material/Grid';

// custom components
import TopBar from "./TopBar";
import WindowManager from './WindowFolder/WindowManager';
import ContextMenu from "./Context/ContextMenu";

export default function Workspace(props: any) {
  interface MouseCoords {
    mouseX: number,
    mouseY: number
  }
  const [contextMenu, setContextMenu] = React.useState<MouseCoords | null>(null);

  const handleOpenContextMenu = (event) => {
    event.preventDefault();
    setContextMenu(
      contextMenu === null
        ? {
          mouseX: event.clientX + 2,
          mouseY: event.clientY - 6,
        }
        : // repeated contextmenu when it is already open closes it with Chrome 84 on Ubuntu
        // Other native context menus might behave different.
        // With this behavior we prevent contextmenu from the backdrop to re-locale existing context menus.
        null,
    );
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };


  const handleClick = (e) => {
    console.log('e', e.target.value);
  }


  return (
    <div
      onContextMenu={handleOpenContextMenu}
      style={{ cursor: 'context-menu' }}
      onClick={(e) => handleClick(e)}
    >

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TopBar />
        </Grid>
        <Grid item xs={12}>

          <WindowManager />

        </Grid>
      </Grid>
      <ContextMenu
        handleCloseContextMenu={handleCloseContextMenu}
        contextMenu={contextMenu}
      />

    </div>

  );
}


