import { useState } from "react";
import { Stack, TextField, List, ListItem, ListItemIcon } from "@mui/material";
import Deleter from "@/components/Deleter";

import { useAppSelector, useAppDispatch, useWindowDefinitions } from "@/lib/hooks";
import { initializeWorkflow, relabelWorkflow, removeWorkflow } from "@/actions/appState";

import EditableText from "@/components/EditableText";

import randomColor from "randomcolor";
import { useSWRF } from "@/lib/swr";


const styles = {
  overflow: "auto", 
  height: "100%",
  position: "relative",
};


export default function Workflows(props) {
  const wdefs = useWindowDefinitions();

  const dispatch = useAppDispatch();
  
  const color = useAppSelector((state) => state.appState.workflow.settings.color);
  
  const workflow_id = useAppSelector((state) => state.appState.workflow._id);
  const workspace_id = useAppSelector((state) => state.appState.workspace._id);
  
  const { data: workflows } = useSWRF(`/workflows/${workspace_id}`)
  

  const [value, setValue] = useState(null);

  const keyChange = (e) => {
    if (e.code === "Enter") {
      dispatch(initializeWorkflow({label: value, color: randomColor()}));
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
          {workflows?.map((workflow) => (
            <div key={workflow._id} style={styles}>
              <ListItem
                sx={{
                  border: workflow._id === workflow_id ? `1px solid ${workflow.history[0].color}` : "",
                }}
              >
                <Stack sx={{ width: "100%" }} direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center">
                    <ListItemIcon>
                      <a href={`/workspace/${workspace_id}/${workflow._id}`}>
                      
                        {wdefs.definitions()["Workflows"].icon([
                          { color: workflow.history[0].settings.color },
                          { "& .MuiChip-icon": { color: workflow.history[0].settings.color } },
                        ])}
                      </a>
                    </ListItemIcon>
                    <EditableText
                      initialValue={workflow.history[0].label}
                      callback={(label) =>
                        dispatch(relabelWorkflow({ relabeled_workflow_id: workflow_id, label: label }))
                      }
                    />
                  </Stack>
                  <Stack direction="row">
                    <Deleter callback={() => dispatch(removeWorkflow({workflow_id: workflow._id}))} color={props.color}></Deleter>
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
