import { useState } from "react";
import { useAppSelector } from "@/lib/hooks";

// material ui
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import CircleIcon from "@mui/icons-material/Circle";
import CircleOutlinedIcon from "@mui/icons-material/CircleOutlined";

// custom
import GroupSelector from "@/components/Groups/GroupSelector";
import BookmarkSelector from "@/components/BookmarkSelector";
import DocumentTitle from "@/components/Documents/DocumentTitle";
import Deleter from "@/components/Deleter";

//actions
import { mark, removeDocumentFromGroup } from "@/actions/appState";

import { preprocessTitle } from "@/lib/preprocessers";
import { useAppDispatch } from "@/lib/hooks";

import { onDragStart } from "@/lib/drag";
import { useSWRF } from "@/lib/swr";

export default function DocumentListItem(props) {
  const dispatch = useAppDispatch();
  const { data: document, error: document_error, isLoading: document_loading } = useSWRF(
    props.id ? `/api/document?document=${props.id}` : null
  );
  const title = document ? preprocessTitle(document.title) : false;
  const settings = useAppSelector((state) => state.appState.workflow.settings);

  const [isHovered, setIsHovered] = useState(false);

  if (document_loading || document_error) {
    return <div>Document Loading...</div>;
  }

  const handleSetIndex = () => {
    if (props.setIndex) {
      props.setIndex(props.listIndex);
    }
  };

  const handleRead = () => {
    dispatch(mark({ document_id: document._id, read: !document.state.read }));
  };

  return (
    <div
      draggable={true}
      onClick={handleSetIndex}
      onDragStart={(e) => onDragStart(e, document._id, "Document")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
      id={document?._id}
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
                {document?.state?.read ? (
                  <CircleOutlinedIcon sx={{ fontSize: 15 }} />
                ) : (
                  <CircleIcon sx={{ fontSize: 15 }} />
                )}
              </IconButton>
            ) : null}
            <GroupSelector id={props.id} />
          </Stack>
          <DocumentTitle title={title} noWrap={false} />
        </Stack>

        <div style={{ width: "24px", height: "24px" }}>
          {props.ShowDeleteIcon && isHovered ? (
            <Deleter
              callback={() =>
                dispatch(
                  removeDocumentFromGroup({
                    group_id: props.group._id,
                    document_id: document._id,
                  })
                )
              }
              color={settings.color}
            />
          ) : null}
        </div>
      </Stack>
    </div>
  );
}
