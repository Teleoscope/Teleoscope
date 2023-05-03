import React, { useContext, useState } from "react";

// material ui
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";

// actions
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { RootState } from "@/stores/store";
import { dragged } from "@/actions/windows";
import { setDraggable } from "@/actions/windows";

// custom
import GroupSelector from "../GroupSelector";
import BookmarkSelector from "../BookmarkSelector";
import DocumentTitle from "./DocumentTitle";

//utils
import { swrContext } from "@/util/swr";
import { PreprocessTitle } from "@/util/Preprocessers";

// contexts
import { StompContext } from "../Stomp";

export default function DocumentListItem(props) {
  const userid = useAppSelector((state) => state.activeSessionID.userid);
  const client = useContext(StompContext)
  const swr = useContext(swrContext);
  const { document } = swr.useSWRAbstract("document", `document/${props.id}`);
  const title = document ? PreprocessTitle(document.title) : false;

  const showGroupIcon = Object.prototype.hasOwnProperty.call(
    props,
    "showGroupIcon"
  )
    ? props.showGroupIcon
    : true;

  const handleRemove = (e) => {
    client.remove_document_from_group(props.group._id, props.id);
  };

  const Delete = () => {
    return (
      <IconButton
        sx={{ width: 20, height: 20 }}
        onClick={(e) => handleRemove(e)}
      >
        <DeleteIcon
          sx={{ "&:hover": { color: "blue" }, width: 20, height: 20 }}
        ></DeleteIcon>
      </IconButton>
    );
  };

  const onDragStart = (event, id, type, typetag) => {
    event.dataTransfer.setData('application/reactflow/type', type);
    event.dataTransfer.setData('application/reactflow/id', `${id}%${typetag}`);
    event.dataTransfer.effectAllowed = 'move';
  };


  const handleSetIndex = () => {
    if (props.setIndex) {
      props.setIndex(props.listIndex)
    }
  }

  return (
    <div
    draggable={true}
    onClick={handleSetIndex}
    onDragStart={(e) => onDragStart(e, props.id + "%" + "document", "Document", "document")}
      style={{
        ...props.style,
        position: "relative",
        borderBottom: "1px solid  #eceeee",
        paddingTop: "2px",
        paddingBottom: "3px",
        width: "100%",
        height: "100%",
        backgroundColor: props.highlight ? "#EEEEEE" : "white"
      }}
      id={props.id}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ marginRight: "0.5em" }}
        >
          <BookmarkSelector id={props.id} />
          {showGroupIcon ? <GroupSelector id={props.id} /> : null}
          <DocumentTitle title={title} noWrap={false} />
        </Stack>

        {props.ShowDeleteIcon ? <Delete /> : <></>}
      </Stack>
    </div>
  );
}
