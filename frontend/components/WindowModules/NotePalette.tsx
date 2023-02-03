import React from 'react';

// mui
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import CommentIcon from '@mui/icons-material/Comment';
// actions
import { useAppDispatch } from '../../hooks'
import { dragged } from "../../actions/windows";

// utils
import useSWRAbstract from "../../util/swr"


function NotePaletteItem(props) {
  const { obj } = useSWRAbstract("obj", `/api/${props.note.key}/${props.note.oid}`);
  let title = "Note";
  let description = "";
  if (props.note.key == "document" && obj) {
    title = obj.title;
    description = obj.text.slice(0, 20) + "...";
  }

  return (
    <ListItem>
      <ListItemIcon><CommentIcon /></ListItemIcon>
      <ListItemText primary={title} secondary={description} />
    </ListItem>
  )
}

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
                    <NotePaletteItem note={n}/>

                </div>
          )})}
          </List>
          </div>
        )
}