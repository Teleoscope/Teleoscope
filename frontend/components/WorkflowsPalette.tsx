import React, { useContext } from "react";
import { IconButton, Stack, TextField, List, ListItem, ListItemIcon } from "@mui/material";
import EditableText from "@/components/EditableText";
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import randomColor from "randomcolor";
import { sessionActivator } from "@/actions/activeSessionID";
import { resetWorkspace } from "@/actions/windows";

import { swrContext } from "@/util/swr";
import { StompContext } from "@/components/Stomp";
import WindowDefinitions from "@/components/WindowFolder/WindowDefinitions";
import AddUserDialogue from "./WindowModules/AddUserDialog";

export default function WorkflowsPalette(props) {
  const client = useContext(StompContext);
  const wdefs = WindowDefinitions();
  const dispatch = useAppDispatch();
  const swr = useContext(swrContext);
  const userid = useAppSelector(state => state.activeSessionID.userid);
  const session_id = useAppSelector(state => state.activeSessionID.value);
  const { sessions } = swr.useSWRAbstract("sessions", `sessions/users/${userid}`);
  const [value, setValue] = React.useState(null);

  // Handle key event for creating a new workflow
  const keyChange = e => e.code === "Enter" && client.initialize_session(value, randomColor());
  
  const handleWorkflowChoice = (sid) => {
    dispatch(resetWorkspace())

    dispatch(sessionActivator(sid))
    dispatch(resetWorkspace())
  }

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      <Stack>
        {/* Create new workflow input field */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <TextField
            label="Create new Workflow..."
            placeholder="Type label and press enter."
            variant="standard"
            onKeyDown={keyChange}
            onChange={e => setValue(e.target.value)}
            InputLabelProps={{ sx: { "&.Mui-focused": { color: props.color } } }}
            sx={{ width: "100%", margin: 1, "& .MuiInput-underline:after": { borderBottomColor: props.color } }}
          />
        </Stack>

        {/* List of workflows */}
        <List>
          {sessions?.map(session => (
            <div key={session._id} style={{ position: "relative" }}>
              <ListItem key={session._id} sx={{backgroundColor: session._id === session_id ? "#EEEEEE" : "white"}}>
                <Stack sx={{ width: "100%" }} direction="row" alignItems="center" justifyContent="space-between">
                  {/* Workflow icon and label */}
                  <Stack direction="row" alignItems="center">
                    <ListItemIcon>
                      <IconButton onClick={() => handleWorkflowChoice(session._id)}>
                        {wdefs["Workflows"].icon([{ color: session.history[0].color }, { '& .MuiChip-icon': { color: session.history[0].color } }])}
                      </IconButton>
                    </ListItemIcon>
                    <EditableText
                      initialValue={session.history[0].label}
                      callback={label => client.relabel_session(label, session._id)}
                    />
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
