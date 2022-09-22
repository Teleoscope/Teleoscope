import React, { createRef, useEffect } from "react";
import { useSelector } from "react-redux";
import Selecto from "react-selecto";

// mui
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

// custom components
import TopBar from "../components/TopBar";
import Search from "./WindowModules/Search";
import WindowManager from "./Window/WindowManager";
import MenuActions from "../components/MenuActions"

// actions
import { addWindow, selectAll, deselectAll } from "../actions/windows";
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

  const handleDispatch = (menu_action) => {
    dispatch(addWindow(MenuActions()[menu_action].default_window));
    handleClose();
  }

  const handleClose = () => {
    setContextMenu(null);
  };

  const handleExistingTeleoscope = (t) => {
    var w = { ...MenuActions()["Teleoscope"].default_window };
    w.i = t + "_" + w.i;
    dispatch(addWindow(w))
    handleClose();
  }

  const handleClick = (e) => {
    // dispatch(deselectAll());
  }
  
  const ref = createRef()
  return (


    <div 
      onContextMenu={handleContextMenu}  
      style={{ cursor: 'context-menu' }}
      onClick={(e) => handleClick(e)}
    >

    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TopBar Logout={props.Logout}/>
      </Grid>
      <Grid ref={ref} item xs={12}>
        
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
        <MenuItem onClick={()=>handleDispatch("Teleoscope")}>New Teleoscope</MenuItem>
        <Divider />
        {teleoscopes?.map((t) => { 
          return <MenuItem onClick={() => handleExistingTeleoscope(t._id)}>{t.label}</MenuItem>  
        })}
        <Divider />

        <MenuItem onClick={()=>handleDispatch("Search")}>New Search</MenuItem>

        <Divider />
        <MenuItem onClick={()=>handleDispatch("Groups")}>New Group Palette</MenuItem>        
        <Divider />
        <MenuItem onClick={()=> dispatch(selectAll())}>Select All</MenuItem>
        <MenuItem onClick={()=> dispatch(deselectAll())}>Deselect All</MenuItem>

    </Menu>
    </div>

  );
}


