import React from 'react';

// mui
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Typography from '@mui/material/Typography';
import CommentIcon from '@mui/icons-material/Comment';
// actions
import { useAppSelector, useAppDispatch } from '../../hooks'
import { RootState } from '../../stores/store'
import { dragged } from "../../actions/windows";

// utils
import useSWRAbstract from "../../util/swr"


export default function NotePalette(props) {
    const { notes } = useSWRAbstract("notes", `/api/notes/`);
    const dispatch = useAppDispatch();


    return (
      <div style={{ overflow: "auto", height: "100%" }}>
        <List>
          {notes?.map((n) => {
            return (
                <div draggable={true}
                    onDragStart={(e:React.DragEvent<HTMLDivElement>):void => {dispatch(dragged({ id: n?._id + "%note", type: "Note" }))}}
                >
                    <ListItem>
                        <ListItemIcon><CommentIcon /></ListItemIcon>
                        <ListItemText primary={n._id} secondary={n._id} />
                    </ListItem>

                </div>
          )})}
          </List>
          </div>
        )
}