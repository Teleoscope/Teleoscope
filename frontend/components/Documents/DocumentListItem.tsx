import React, { useState } from "react";

// material ui
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import FlareIcon from '@mui/icons-material/Flare';
import DeleteIcon from '@mui/icons-material/Delete';

// actions
import { useAppSelector, useAppDispatch } from '../../hooks'
import { RootState } from '../../stores/store'
import { dragged } from "../../actions/windows";

// custom
import GroupSelector from "../GroupSelector";
import BookmarkSelector from "../BookmarkSelector";
import DocumentTitle from './DocumentTitle';

//utils
import useSWRAbstract from "../../util/swr"
import { PreprocessTitle } from "../../util/Preprocessers"

// contexts
import { Stomp } from '../Stomp'

export default function DocumentListItem(props) {
  const userid = useAppSelector((state) => state.activeSessionID.userid);
  const client = Stomp.getInstance();
  client.userId = userid;
  const { document } = useSWRAbstract("document", `/api/document/${props.id}`);
  const title = document ? PreprocessTitle(document.title) : false;
  const dispatch = useAppDispatch();
  const [hover, setHover] = useState(false);
  const magnitude = useAppSelector((state: RootState) => state.teleoscopes.magnitude);

  const showGroupIcon = Object.prototype.hasOwnProperty.call(props, "showGroupIcon") ? props.showGroupIcon : true;

  const handleOrientTowards = () => {
    client.reorient(props.group.teleoscope, [props.id], [], magnitude)
  }
  
  const handleRemove = () => {
    client.remove_document_from_group(props.group._id, props.id)
  }

  return (

    <div
      draggable={true}
      className="droppable-element"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderBottom: "1px solid  #eceeee",
        paddingTop: "2px",
        paddingBottom: "3px",
        backgroundColor: hover ? "#EEEEEE" : "#FFFFFF",
        width: "100%",
        height: "100%",
      }}
      id={props.id}
      onDragStart={() => { dispatch(dragged({ id: props.id + "%document", type: "Document" })) }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{marginRight:  "0.5em"}}
        >
          <BookmarkSelector id={props.id} />
          {showGroupIcon ? <GroupSelector id={props.id} /> : null}
          {Object.prototype.hasOwnProperty.call(props, "group") ? <IconButton sx={{ width: 20, height: 20 }} onClick={() => handleOrientTowards()}>
            {<FlareIcon sx={{ '&:hover': {color: 'blue'}, width: 20, height: 20 }}></FlareIcon>}
          </IconButton> : ""}
          <DocumentTitle title={title} noWrap={false} />
        </Stack>

        {Object.prototype.hasOwnProperty.call(props, "group") ? (
          <IconButton sx={{ width: 20, height: 20 }} onClick={() => handleRemove()}>
            <DeleteIcon sx={{ '&:hover': {color: 'red'}, width: 20, height: 20 }}></DeleteIcon>
          </IconButton>
         ) 
      
        : ""}

      </Stack>

    </div>
  );
}
