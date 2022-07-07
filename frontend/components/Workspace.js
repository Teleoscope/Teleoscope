import React, { useEffect } from "react";
import { useSelector } from "react-redux";

// mui
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

// custom components
import TopBar from "../components/TopBar";
import LeftMenuBar from "../components/LeftMenuBar";
import RightMenuBar from "../components/RightMenuBar";
import WindowManager from "../components/WindowManager";
import Search from "../components/Search";

// actions
import { addWindow } from "../actions/windows";
import { useDispatch } from "react-redux";


export default function Workspace(props) {
  const dispatch = useDispatch();
  const [contextMenu, setContextMenu] = React.useState(null);

  const handleContextMenu = (event) => {
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

  const handleClose = () => {
    setContextMenu(null);
  };

  const handleNewTeleoscope = () => {
    dispatch(addWindow(
      {i: "teleoscope", x:0, y:0, w:2, h:10, type: "Teleoscope", isResizable: false})
    );
    handleClose();
  }

  const handleNewSearch = () => {

    dispatch(addWindow(
      {i: "search", x:0, y:0, w:2, h:10, type: "Search", isResizable: false})
    );
    handleClose();
  }

  return (
    <div onContextMenu={handleContextMenu} style={{ cursor: 'context-menu' }}>
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TopBar/>
      </Grid>
      <Grid item xs={12}>
        <WindowManager />
      </Grid>
    </Grid>
    <Menu
        open={contextMenu !== null}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleNewTeleoscope}>New Teleoscope</MenuItem>
        <MenuItem onClick={handleNewSearch}>New Search</MenuItem>
    </Menu>
    </div>

  );
}


