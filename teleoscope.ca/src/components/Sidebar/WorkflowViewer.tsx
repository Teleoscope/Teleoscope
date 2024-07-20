import { useState } from "react";
import { Stack, TextField, List, ListItem, ListItemIcon } from "@mui/material";
import Deleter from "@/components/Deleter";

import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { initializeWorkflow, relabelWorkflow, removeWorkflow } from "@/actions/appState";

import EditableText from "@/components/EditableText";

import randomColor from "randomcolor";
import { useSWRF } from "@/lib/swr";
import WindowDefinitions from "../WindowFolder/WindowDefinitions";


const styles = {
  overflow: "auto", 
  height: "100%",
  position: "relative",
};


export default function Workflows(props) {

  const dispatch = useAppDispatch();
  
  const color = useAppSelector((state) => state.appState.workflow.settings.color);
  
  const workflow_id = useAppSelector((state) => state.appState.workflow._id);
  const { workspace } = useAppSelector((state) => state.appState);

  if (!workspace) {
    throw Error("No workspace.")
  }
  
  const { data: workflows, isLoading, error } = useSWRF(`/api/workflows?workflows=${workspace.workflows?.join(',')}`)
  const [value, setValue] = useState(null);
  
  if (isLoading) {
    return <>Loading...</>
  }

  if (error) {
    return <>Error</>
  }


  

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
                  border: workflow._id === workflow_id ? `1px solid ${workflow.settings.color}` : "",
                }}
              >
                <Stack sx={{ width: "100%" }} direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center">
                    <ListItemIcon>
                      <a href={`/workspace/${workspace._id}/${workflow._id}`}>
                      
                        {WindowDefinitions("Workflows").icon([
                          { color: workflow.settings.color },
                          { "& .MuiChip-icon": { color: workflow.settings.color } },
                        ])}
                      </a>
                    </ListItemIcon>
                    <EditableText
                      initialValue={workflow.label}
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
