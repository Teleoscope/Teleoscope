import React, { useContext } from "react";
import { useAppSelector } from "@/util/hooks";

// material ui
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import CircleIcon from "@mui/icons-material/Circle";
import CircleOutlinedIcon from "@mui/icons-material/CircleOutlined";

// custom
import GroupSelector from "@/components/GroupSelector";
import BookmarkSelector from "@/components/BookmarkSelector";
import DocumentTitle from "@/components/Documents/DocumentTitle";

//utils
import { swrContext } from "@/util/swr";
import { PreprocessTitle } from "@/util/Preprocessers";

// contexts
import { StompContext } from "@/components/Stomp";

export default function DocumentListItem(props) {
  const client = useContext(StompContext);
  const swr = useContext(swrContext);
  const { document } = swr.useSWRAbstract("document", `document/${props.id}`);
  const title = document ? PreprocessTitle(document.title) : false;
  const session_id = useAppSelector((state) => state.activeSessionID.value);

  const handleRemove = () => {
    client.remove_document_from_group(props.group._id, props.id);
  };

  const onDragStart = (event, id, type, typetag) => {
    event.dataTransfer.setData("application/reactflow/type", type);
    event.dataTransfer.setData("application/reactflow/id", `${id}%${typetag}`);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleSetIndex = () => {
    if (props.setIndex) {
      props.setIndex(props.listIndex);
    }
  };
  const handleRead = () => {
    client.mark(document._id, session_id, !document.state.read);
  };
  return (
    <div
      draggable={true}
      onClick={handleSetIndex}
      onDragStart={(e) =>
        onDragStart(e, props.id + "%" + "document", "Document", "document")
      }
      style={{
        ...props.style,
        position: "relative",
        borderBottom: "1px solid  #eceeee",
        paddingTop: "2px",
        paddingBottom: "3px",
        width: "100%",
        height: "100%",
        backgroundColor: props.highlight ? "#EEEEEE" : "white",
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
          <Stack
            direction="row"
            alignItems="center"
            sx={{ marginRight: "0.75em" }}
          >
            <BookmarkSelector id={props.id} />
            {props.showReadIcon ? (
              <IconButton onClick={handleRead}>
                {document?.state.read ? (
                  <CircleOutlinedIcon sx={{ fontSize: 15 }} />
                ) : (
                  <CircleIcon sx={{ fontSize: 15 }} />
                )}
              </IconButton>
            ) : null}
            {props.showGroupIcon ? <GroupSelector id={props.id} /> : null}
          </Stack>
          <DocumentTitle title={title} noWrap={false} />
        </Stack>

        {props.ShowDeleteIcon ? (
          <IconButton
            sx={{ width: 20, height: 20 }}
            onClick={(e) => handleRemove()}
          >
            <DeleteIcon
              sx={{ "&:hover": { color: "blue" }, width: 20, height: 20 }}
            ></DeleteIcon>
          </IconButton>
        ) : (
          <></>
        )}
      </Stack>
    </div>
  );
}
