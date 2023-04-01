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
import { setDraggable } from "../../actions/windows";

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

  const showGroupIcon = Object.prototype.hasOwnProperty.call(props, "showGroupIcon") ? props.showGroupIcon : true;
  
  const handleRemove = (e) => {
    e.stopPropagation()
    client.remove_document_from_group(props.group._id, props.id)
  }


  return (

    <div
      draggable={true}
      className="droppable-element"
      style={{
        ...props.style,
        borderBottom: "1px solid  #eceeee",
        paddingTop: "2px",
        paddingBottom: "3px",
        width: "100%",
        height: "100%",
      }}
      id={props.id}
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
          <DocumentTitle title={title} noWrap={false} />
        </Stack>

        {props.ShowDeleteIcon ? (
          <IconButton sx={{ width: 20, height: 20 }} disableRipple onClick={(e) => handleRemove(e)}>
            <DeleteIcon sx={{ '&:hover': {color: 'red'}, width: 20, height: 20 }}></DeleteIcon>
          </IconButton>
         ) 
      
        : ""}

      </Stack>

    </div>
  );
}
