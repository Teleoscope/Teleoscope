import React, { useState } from "react";
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
import Deleter from "@/components/Deleter";

import { useAppSelector, useAppDispatch, useWindowDefinitions } from "@/util/hooks";
import { relabelSession } from "@/actions/windows";

import EditableText from "@/components/EditableText";

import randomColor from "randomcolor";

import { useSWRHook } from "@/util/swr";
import { useStomp } from "@/util/Stomp";
import { useSession } from "next-auth/react";

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
  const client = useStomp();
  const wdefs = useWindowDefinitions();

  const dispatch = useAppDispatch();
  const swr = useSWRHook();
  const color = useAppSelector((state) => state.windows.settings.color);

  const { data, status } = useSession();
  const userid = data?.user?.id;
  
  const session_id = useAppSelector((state) => state.activeSessionID.value);
  const workspace_id = useAppSelector((state) => state.activeSessionID.workspace);
  
  const { workflows } = swr.useSWRAbstract("workflows", `/workflows/${workspace_id}`)
  

  const [value, setValue] = useState(null);

  const keyChange = (e) => {
    if (e.code === "Enter") {
      client.initialize_workflow(value, randomColor());
    }
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
          {workflows?.map((session) => (
            <div key={session._id} style={styles}>
              <ListItem
                sx={{
                  border: session._id === session_id ? `1px solid ${session.history[0].color}` : "",
                }}
              >
                <Stack sx={{ width: "100%" }} direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center">
                    <ListItemIcon>
                      <a href={`/workspace/${workspace_id}/${session._id}`}>
                      
                        {wdefs.definitions()["Workflows"].icon([
                          { color: session.history[0].settings.color },
                          { "& .MuiChip-icon": { color: session.history[0].settings.color } },
                        ])}
                      </a>
                    </ListItemIcon>
                    <EditableText
                      initialValue={session.history[0].label}
                      callback={(label) =>
                        dispatch(relabelSession({ client: client, session_id: session_id, label: label }))
                      }
                    />
                  </Stack>
                  <Stack direction="row">
                    <Deleter callback={() => client.remove_workflow(session._id)} color={props.color}></Deleter>
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
