import React, { useRef, createRef, useEffect, useContext } from "react";
import { useAppSelector, useAppDispatch } from '../hooks'
import { RootState, AppDispatch } from '../stores/store'

// mui
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';

// custom components
import TopBar from "./TopBar";
import WindowManager from "./WindowManager";
import MenuActions from "./MenuActions"

// actions
import { addWindow, selectAll, deselectAll } from "../actions/windows";
import { useDispatch } from "react-redux";

// util
import useSWRAbstract from "../util/swr"
import { cluster_by_groups } from "./Stomp";

// contexts
import { StompContext } from '../context/StompContext'
import internal from "stream";

export default function Workspace(props) {
  const client = useContext(StompContext)

  const dispatch = useAppDispatch();

  interface MouseCoords {
    mouseX: number,
    mouseY: number
  }

  const [contextMenu, setContextMenu] = React.useState<MouseCoords | null>(null);
  const session_id = useAppSelector((state: RootState) => state.activeSessionID.value);
  const { teleoscopes_raw } = useSWRAbstract("teleoscopes_raw", `/api/sessions/${session_id}/teleoscopes`);
  const teleoscopes = teleoscopes_raw?.map((t) => {
    var ret = {
      _id: t._id,
      label: t.history[t.history.length - 1].label
    }
    return ret;
  });
  const { groups_raw } = useSWRAbstract("groups_raw", `/api/sessions/${session_id}/groups`);
  const group_ids = groups_raw?.map((g) => {
    return g._id;
  })

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

  const handleTestClusters = () => {
    cluster_by_groups(client, group_ids, "62a7ca02d033034450035a91", session_id);
  }
  
  const ref = useRef();
  return (


    <div 
      onContextMenu={handleContextMenu}  
      style={{ cursor: 'context-menu' }}
      onClick={(e) => handleClick(e)}
    >

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
        <MenuItem onClick={()=> dispatch(selectAll(null))}>Select All</MenuItem>
        <MenuItem onClick={()=> dispatch(deselectAll(null))}>Deselect All</MenuItem>
        <Divider />
        <MenuItem onClick={()=>handleTestClusters()}>Test Clusterings</MenuItem>

    </Menu>
    </div>

  );
}


