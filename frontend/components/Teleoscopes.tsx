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
import { useAppSelector } from "@/util/hooks";
import { RootState } from "@/stores/store";

// utils
import { useSWRHook } from "@/util/swr";
import { useStomp } from "@/util/Stomp";
import { NewItemForm } from "./NewItemForm";
import { onDragStart } from "@/util/drag";


export default function Teleoscopes(props) {
  const client = useStomp();

  const session_id = useAppSelector(
    (state: RootState) => state.activeSessionID.value
  );

 
  
  const swr = useSWRHook();
  const { teleoscopes_raw } = swr.useSWRAbstract(
    "teleoscopes_raw",
    `sessions/${session_id}/teleoscopes`
  );

  const teleoscopes = teleoscopes_raw?.map((t) => {
    const ret = {
      _id: t._id,
      label: t.history[0].label,
    };
    return ret;
  });

  const keyChange = (e) => client.initialize_teleoscope(session_id, e.target.value);

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
                      callback={(label) =>
                        client.relabel_teleoscope(label, t._id)
                      }
                    />
                  </Stack>
                  <Deleter callback={() => client.remove_teleoscope(t._id, session_id)} color={props.color}></Deleter>
                </Stack>
              </ListItem>
            </div>
          ))}
        </List>
      </Stack>
    </div>
  );
}
