import React, { useEffect } from "react";
import { useSelector } from "react-redux";

// mui
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

// custom components
import TopBar from "../components/TopBar";
import LeftMenuBar from "../components/LeftMenuBar";
import RightMenuBar from "../components/RightMenuBar";
import WindowManager from "../components/WindowManager";
import Search from "../components/Search";

// actions
import { addWindow } from "../actions/windows";
import { useDispatch } from "react-redux";

// util
import useSWRAbstract from "../util/swr"


export default function Workspace(props) {
  const dispatch = useDispatch();
  const [contextMenu, setContextMenu] = React.useState(null);
  const session_id = useSelector((state) => state.activeSessionID.value);
  const { teleoscopes_raw } = useSWRAbstract("teleoscopes_raw", `/api/sessions/${session_id}/teleoscopes`);
  const teleoscopes = teleoscopes_raw?.map((t) => {
    var ret = {
      _id: t._id,
      label: t.history[t.history.length - 1].label
    }
    return ret;
  });
  console.log("teleoscopes", teleoscopes, teleoscopes_raw, `/api/sessions/${session_id}/teleoscopes`)

  
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
      {i: "teleoscope_new", x:0, y:0, w:2, h:10, type: "Teleoscope", isResizable: false})
    );
    handleClose();
  }
  const handleExistingTeleoscope = (t) => {
    dispatch(addWindow(
      {i: t + "_teleoscope", x:0, y:0, w:2, h:10, type: "Teleoscope", isResizable: false})
    );
    handleClose();
  }

  const handleNewSearch = () => {

    dispatch(addWindow(
      {i: "%search", x:0, y:0, w:2, h:10, type: "Search", isResizable: false})
    );
    handleClose();
  }

  const handleNewGroupPalette = () => {

    dispatch(addWindow(
      {i: "group", x:0, y:0, w:2, h:10, type: "Group Palette", isResizable: false})
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
        <Divider />
        {teleoscopes?.map((t) => { 
          return <MenuItem onClick={() => handleExistingTeleoscope(t._id)}>{t.label}</MenuItem>  
        })}
        <Divider />

        <MenuItem onClick={handleNewSearch}>New Search</MenuItem>

        <Divider />
        <MenuItem onClick={handleNewGroupPalette}>New Group Palette</MenuItem>        
    </Menu>
    </div>

  );
}


