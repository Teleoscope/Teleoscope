import React, { useState, useContext } from "react";
import {
  IconButton,
  Stack,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  Menu,
} from "@mui/material";
import PopupState, { bindTrigger, bindMenu } from "material-ui-popup-state";
import PaletteIcon from "@mui/icons-material/Palette";
import PeopleIcon from "@mui/icons-material/People";

import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { sessionActivator, resetWorkspace, relabelSession } from "@/actions/windows";

import EditableText from "@/components/EditableText";
import WindowDefinitions from "@/components/WindowFolder/WindowDefinitions";
import AddUserDialogue from "@/components/AddUserDialog";

import { CompactPicker } from "react-color";
import randomColor from "randomcolor";

import { swrContext } from "@/util/swr";
import { StompContext } from "@/components/Stomp";
import { MenuUnstyled } from '@mui/core';

const styles = {
  overflow: "auto",
  height: "100%",
  position: "relative",
};

const PopoverButton = ({ popupState, children, icon }) => (
  <React.Fragment>
    <IconButton variant="contained" {...bindTrigger(popupState)}>
      {icon}
    </IconButton>
    <Menu {...bindMenu(popupState)}>{children}</Menu>
  </React.Fragment>
);


const renderPopupButton = (popupId, icon, children) => (
  <PopupState variant="popover" popupId={popupId}>
    {(popupState) => (
      <PopoverButton popupState={popupState} icon={icon}>
        {children}
      </PopoverButton>
    )}
  </PopupState>
);

export default function Workflows(props) {
  const client = useContext(StompContext);
  const windowState = useAppSelector((state) => state.windows);
  const wdefs = WindowDefinitions(windowState);

  const dispatch = useAppDispatch();
  const swr = useContext(swrContext);
  const color = useAppSelector((state) => state.windows.settings.color);

  const userid = useAppSelector((state) => state.activeSessionID.userid);
  const session_id = useAppSelector((state) => state.activeSessionID.value);
  const { sessions } = swr.useSWRAbstract("sessions", `sessions/users/${userid}`);
  const [value, setValue] = useState(null);

  const keyChange = (e) => {
    if (e.code === "Enter") {
      client.initialize_session(value, randomColor());
    }
  };

  const handleWorkflowChoice = (sid) => {
    dispatch(resetWorkspace());
    dispatch(sessionActivator(sid));
  };

  const handleColorChange = (color, sid) => {
    client.recolor_session(color.hex, sid);
  };

  return (
    <div style={styles}>
      <Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <TextField
            label="Create new Workflow..."
            placeholder="Type label and press enter."
            variant="standard"
            onKeyDown={keyChange}
            onChange={(e) => setValue(e.target.value)}
            InputLabelProps={{
              sx: { "&.Mui-focused": { color: color } },
            }}
            sx={{
              width: "100%",
              margin: 1,
              "& .MuiInput-underline:after": { borderBottomColor: color },
            }}
          />
        </Stack>

        <List>
          {sessions?.map((session) => (
            <div key={session._id} style={styles}>
              <ListItem
                sx={{
                  border: session._id === session_id ? `1px solid ${session.history[0].color}` : "",
                }}
              >
                <Stack sx={{ width: "100%" }} direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center">
                    <ListItemIcon>
                      <IconButton onClick={() => handleWorkflowChoice(session._id)}>
                        {wdefs["Workflows"].icon([
                          { color: session.history[0].color },
                          { "& .MuiChip-icon": { color: session.history[0].color } },
                        ])}
                      </IconButton>
                    </ListItemIcon>
                    <EditableText
                      initialValue={session.history[0].label}
                      callback={(label) =>
                        dispatch(relabelSession({ client: client, session_id: session_id, label: label }))
                      }
                    />
                  </Stack>
                  <Stack direction="row">
                      {renderPopupButton(
                        "color-picker-popup-menu",
                        <PaletteIcon fontSize="small" />,
                        <CompactPicker
                          color={color}
                          onChangeComplete={(color) => handleColorChange(color, session._id)}
                        />
                      )}
                      {renderPopupButton(
                        "add-user-popup-menu",
                        <PeopleIcon fontSize="small" />,
                        <AddUserDialogue session_id={session._id} />
                      )}
                  </Stack>
                </Stack>
              </ListItem>
            </div>
          ))}
        </List>
      </Stack>
    </div>
  );
}
