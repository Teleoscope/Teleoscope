// mui
import {
  Stack,
  List,
  ListItem,
  ListItemIcon,
} from "@mui/material";

import FlareIcon from "@mui/icons-material/Flare";

// custom
import EditableText from "@/components/EditableText";
import Deleter from "@/components/Deleter";

// actions
import { RootState } from "@/lib/store";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";

// utils
import { NewItemForm } from "@/components/NewItemForm";
import { onDragStart } from "@/lib/drag";
import { initializeTeleoscope, relabelTeleoscope, removeTeleoscope } from "@/actions/appState";
import { useSWRF } from "@/lib/swr";


export default function Teleoscopes(props) {
  const dispatch = useAppDispatch()

  const workflow_id = useAppSelector(
    (state: RootState) => state.appState.workflow._id
  );
  
  
  const { data: teleoscopes_raw } = useSWRF(
    `sessions/${workflow_id}/teleoscopes`
  );

  const teleoscopes = teleoscopes_raw?.map((t) => {
    const ret = {
      _id: t._id,
      label: t.history[0].label,
    };
    return ret;
  });

  const keyChange = (e) => dispatch(initializeTeleoscope({
    label: e.target.value,
  },))
  

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      <Stack>
        <NewItemForm label="Create new Teleoscope..."  HandleSubmit={keyChange} /> 
        <List>
          {teleoscopes?.map((t) => (
            <div
              key={t._id}
              draggable={true}
              style={{ position: "relative" }}
              onDragStart={(e) => onDragStart(e, t._id, "Teleoscope",)}
            >
              <ListItem key={t._id}>
                <Stack
                  sx={{ width: "100%" }}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Stack direction="row" alignItems="center">
                    <ListItemIcon>
                      <FlareIcon />
                    </ListItemIcon>

                    <EditableText
                      initialValue={t.label}
                      callback={(label) => dispatch(relabelTeleoscope({label: label, teleoscope_id: t._id}))}
                    />
                  </Stack>
                  <Deleter 
                    callback={() => dispatch(removeTeleoscope({teleoscope_id: t._id}))} 
                    color={props.color} />
                </Stack>
              </ListItem>
            </div>
          ))}
        </List>
      </Stack>
    </div>
  );
}
