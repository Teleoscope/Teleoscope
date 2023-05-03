import React, { useContext } from "react";

// mui
import {
  IconButton,
  Stack,
  TextField,
  List,
  ListItem,
  ListItemIcon,
} from "@mui/material";

// custom
import EditableText from "@/components/EditableText";

// actions
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { RootState } from "@/stores/store";
import randomColor from "randomcolor";
import { sessionActivator, setUserId } from "@/actions/activeSessionID";

// utils
import { swrContext } from "@/util/swr";
import { StompContext } from "@/components/Stomp";
import WindowDefinitions from "@/components/WindowFolder/WindowDefinitions";

export default function WorkflowsPalette(props) {
  const client = useContext(StompContext);


  const dispatch = useAppDispatch();
  const swr = useContext(swrContext);
  const userid = useAppSelector((state) => state.activeSessionID.userid);
  const session_id = useAppSelector((state) => state.activeSessionID.value);

  const { sessions } = swr.useSWRAbstract("sessions", `sessions/users/${userid}`);


  const [value, setValue] = React.useState(null);

  const keyChange = (e) => {
    if (e.code == "Enter") {
      client.initialize_session(value, randomColor() );
    }
  };

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      <Stack>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          style={{ margin: 0 }}
        >
          <TextField
            label="Create new Workflow..."
            placeholder="Type label and press enter."
            variant="standard"
            onKeyDown={(e) => keyChange(e)}
            onChange={(e) => setValue(e.target.value)}
            InputLabelProps={{
              sx: {
                "&.Mui-focused": {
                  color: props.color,
                },
              },
            }}
            sx={{
              width: "100%",
              margin: 1,
              // '& .MuiInput-underline:before': {borderBottomColor: props.color},
              "& .MuiInput-underline:after": { borderBottomColor: props.color },
              // '& .MuiInputLabel-root': {borderBottomColor: props.color},
            }}
          />
        </Stack>
        <List>
          {sessions?.map((session) => (
            <div
              key={session._id}
              style={{ position: "relative" }}
              
            >
              <ListItem key={session._id} sx={{backgroundColor: session._id == session_id ? "#EEEEEE" : "white"}}>
                <Stack
                  sx={{ width: "100%" }}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Stack direction="row" alignItems="center">
                    <ListItemIcon>
                      <IconButton onClick={
                          () => dispatch(sessionActivator(session._id))

                      }>
                        {WindowDefinitions()["Workflows"].icon(
                          [
                            { color: session.history[0].color },
                            { '& .MuiChip-icon': { color: session.history[0].color } }
                        ]
                    
                        )}
                      </IconButton>
                    </ListItemIcon>

                    <EditableText
                      initialValue={session.history[0].label}
                      callback={(label) =>
                        client.relabel_session(label, session._id)
                      }
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
