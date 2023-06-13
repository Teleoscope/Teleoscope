import React, { useContext } from "react";

// mui
import { Stack, Box, Tooltip, IconButton } from "@mui/material";

// actions
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { RootState } from "@/stores/store";
import { StompContext } from "@/components/Stomp";

// custom components
import DocumentListItem from "@/components/Documents/DocumentListItem";
import ButtonActions from "@/components/ButtonActions";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import { loadBookmarkedDocuments } from "@/actions/bookmark";

export default function SearchWindow() {
  const bookmarks = useAppSelector(
    (state: RootState) => state.bookmarker.value
  );

  const MakeGroupFromBookmarks = () => {
    const dispatch = useAppDispatch();
    const client = useContext(StompContext);
    const session_id = useAppSelector(
      (state: RootState) => state.activeSessionID.value
    );
    const bookmarks = useAppSelector(
      (state: RootState) => state.bookmarker.value
    );

    const handleMakeGroupFromBookmarks = () => {
      client.add_group(
        "group from bookmarks",
        "#DDDDDD",
        session_id,
        bookmarks
      );
      dispatch(loadBookmarkedDocuments([]));
    };
    return (
      <Tooltip
        title="Make group from bookmarks"
        key="Make group from bookmarks"
      >
        <IconButton onClick={handleMakeGroupFromBookmarks}>
          <GroupWorkIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  };

  return (
    <Stack direction="column">
      <ButtonActions inner={[[MakeGroupFromBookmarks, {}]]}></ButtonActions>
      <Box>
        {bookmarks.map((docid) => (
          <DocumentListItem key={docid} id={docid}>
            {" "}
          </DocumentListItem>
        ))}
      </Box>
    </Stack>
  );
}
