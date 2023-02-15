import React from 'react';

// mui
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Typography from '@mui/material/Typography';
import FlareIcon from '@mui/icons-material/Flare';

// actions
import { useAppSelector, useAppDispatch } from '../../hooks'
import { RootState } from '../../stores/store'
import { dragged } from "../../actions/windows";

// utils
import useSWRAbstract from "../../util/swr"


export default function TeleoscopePalette(props) {
    const session_id = useAppSelector((state: RootState) => state.activeSessionID.value);
    const { teleoscopes_raw } = useSWRAbstract("teleoscopes_raw", `/api/sessions/${session_id}/teleoscopes`);
    const dispatch = useAppDispatch();

    const teleoscopes = teleoscopes_raw?.map((t) => {
      const ret = {
        _id: t._id,
        label: t.history[0].label
      }
      return ret;
    });
    return (
      <div style={{ overflow: "auto", height: "100%" }}>
        <List>
          {teleoscopes?.map((t) => {
            return (
                <div draggable={true}
                    onDragStart={(e:React.DragEvent<HTMLDivElement>):void => {dispatch(dragged({ id: t?._id + "%teleoscope", type: "Teleoscope" }))}}
                >
                    <ListItem>
                        <ListItemIcon><FlareIcon /></ListItemIcon>
                        <ListItemText primary={t.label} secondary={t._id} />
                    </ListItem>

                </div>
          )})}
          </List>
          </div>
        )
}