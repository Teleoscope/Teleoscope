import React from "react";

import { useAppSelector, useAppDispatch } from '../../hooks'
import { RootState } from '../../stores/store'

// mui
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import MenuUnstyled from '@mui/base/MenuUnstyled';


// custom components
import MenuActions from "./ContextMenuActions"

// actions
import { addWindow, selectAll, deselectAll } from "../../actions/windows";

// util
import useSWRAbstract from "../../util/swr"
//import { cluster_by_groups, initialize_teleoscope } from "../Stomp";

// contexts
import { Stomp } from '../Stomp'
import { color } from "@mui/system";
import ColorPicker from "../ColorPicker";
import Typography from "@mui/material/Typography";

export default function ContextMenu(props) {
    const userid = useAppSelector((state: RootState) => state.activeSessionID.userid);
    const client = Stomp.getInstance();
    client.userId = userid;

    const [colorPicker, setColorPicker] = React.useState(false);

    const dispatch = useAppDispatch();

    const session_id = useAppSelector((state: RootState) => state.activeSessionID.value);
    const { teleoscopes_raw } = useSWRAbstract("teleoscopes_raw", `/api/sessions/${session_id}/teleoscopes`);
    const { session } = useSWRAbstract("session", `/api/sessions/${session_id}`);

    const teleoscopes = teleoscopes_raw?.map((t) => {
        const ret = {
            _id: t._id,
            label: t.history[0].label
        }
        return ret;
    });
    const { groups_raw } = useSWRAbstract("groups_raw", `/api/sessions/${session_id}/groups`);
    const group_ids = groups_raw?.map((g) => {
        return g._id;
    })

    const handleOpenNewWindow = (menu_action) => {
        dispatch(addWindow(MenuActions()[menu_action].default_window));
        props.handleCloseContextMenu();
    }

    const handleExistingTeleoscope = (t) => {
        const w = { ...MenuActions()["Teleoscope"].default_window };
        w.i = t + w.i;
        dispatch(addWindow(w))
        props.handleCloseContextMenu();
    }


    const handleOpenColorPicker = () => {
        setColorPicker(true);
    }

    const handleClose = () => {
        props.handleCloseContextMenu()
        setColorPicker(false)
    }

    const handleColorChange = (color) => {
        client.recolor_session(color, session_id)
    }

    if (colorPicker) {
        return (
            <Menu
                sx={{ displayPrint: 'none' }}
                open={props.contextMenu !== null}
                onClose={() => setColorPicker(false)}
                anchorReference="anchorPosition"
                anchorPosition={
                    props.contextMenu !== null
                        ? { top: props.contextMenu.mouseY, left: props.contextMenu.mouseX }
                        : undefined
                }
            >
                <ColorPicker 
                    defaultColor={session?.history[0].color} 
                    onChange={handleColorChange}>
                </ColorPicker>
            </Menu>
        ) 
        
    }



    return (
        <Menu
            open={props.contextMenu !== null}
            onClose={() => handleClose()}
            anchorReference="anchorPosition"
            anchorPosition={
                props.contextMenu !== null
                    ? { top: props.contextMenu.mouseY, left: props.contextMenu.mouseX }
                    : undefined
            }
        >
            <MenuItem >
                <Typography variant="overline" onClick={() => handleOpenNewWindow("Teleoscopes")}>
                    All Teleoscopes
                </Typography>
            </MenuItem>
            {teleoscopes?.map((t) => {
                return (
                    <MenuItem key={t._id} onClick={() => handleExistingTeleoscope(t._id)}>
                        {t.label}
                    </MenuItem>
                )
            })}
            <Divider />

            <MenuItem onClick={() => handleOpenNewWindow("Search")}>
                Open Search
            </MenuItem>
            <MenuItem onClick={() => handleOpenNewWindow("Groups")}>
                Open Group Palette
            </MenuItem>
            <MenuItem onClick={() => handleOpenNewWindow("FABMenu")}>
                Open Floating Menu
            </MenuItem>
            <Divider />

            <MenuItem onClick={() => dispatch(selectAll(null))}>
                Select All
            </MenuItem>
            <MenuItem onClick={() => dispatch(deselectAll(null))}>
                Deselect All
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => handleOpenColorPicker()}>Change session color</MenuItem>
        </Menu>
    )
}