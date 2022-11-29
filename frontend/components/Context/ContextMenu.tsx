import React, { useRef, useContext } from "react";

import { useAppSelector, useAppDispatch } from '../../hooks'
import { RootState } from '../../stores/store'

// mui
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';

// custom components
import MenuActions from "./ContextMenuActions"

// actions
import { addWindow, selectAll, deselectAll } from "../../actions/windows";

// util
import useSWRAbstract from "../../util/swr"
//import { cluster_by_groups, initialize_teleoscope } from "../Stomp";

// contexts
import { Stomp } from '../Stomp'

export default function ContextMenu(props) {
    const userid = useAppSelector((state: RootState) => state.activeSessionID.userid);
    const client = Stomp.getInstance();
    client.userId = userid;

    const dispatch = useAppDispatch();

    const session_id = useAppSelector((state: RootState) => state.activeSessionID.value);
    const { teleoscopes_raw } = useSWRAbstract("teleoscopes_raw", `/api/sessions/${session_id}/teleoscopes`);
    const teleoscopes = teleoscopes_raw?.map((t) => {
        var ret = {
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
        var w = { ...MenuActions()["Teleoscope"].default_window };
        w.i = t + w.i;
        dispatch(addWindow(w))
        props.handleCloseContextMenu();
    }

    const handleNewTeleoscope = (s_id) => {
        client.initialize_teleoscope(s_id);
    }

    return (
        <Menu
            open={props.contextMenu !== null}
            onClose={props.handleCloseContextMenu}
            anchorReference="anchorPosition"
            anchorPosition={
                props.contextMenu !== null
                    ? { top: props.contextMenu.mouseY, left: props.contextMenu.mouseX }
                    : undefined
            }
        >
            <MenuItem onClick={() => {
                handleOpenNewWindow("Teleoscope");
                handleNewTeleoscope(session_id);
            }
                }>New Teleoscope</MenuItem>
            <Divider />
            {teleoscopes?.map((t) => {
                return (
                    <MenuItem onClick={() => handleExistingTeleoscope(t._id)}>
                        {t.label}
                    </MenuItem>
                )
            })}
            <Divider />

            <MenuItem onClick={() => handleOpenNewWindow("Search")}>
                New Search
            </MenuItem>
            <Divider />

            <MenuItem onClick={() => handleOpenNewWindow("Groups")}>
                New Group Palette
            </MenuItem>
            <Divider />

            <MenuItem onClick={() => dispatch(selectAll(null))}>
                Select All
            </MenuItem>
            <MenuItem onClick={() => dispatch(deselectAll(null))}>
                Deselect All
            </MenuItem>
            <Divider />
        </Menu>
    )
}