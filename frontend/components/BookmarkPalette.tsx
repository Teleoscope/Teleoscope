import React, { useState, useContext } from "react";

// mui
import { Stack, Box } from "@mui/material";

// actions
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { RootState } from "@/stores/store";

// custom components
import DocumentListItem from "./Documents/DocumentListItem";

export default function SearchWindow(props) {

  const bookmarks = useAppSelector((state: RootState) => state.bookmarker.value);

  return (
      <Box>
        {bookmarks.map((docid) => <DocumentListItem key={docid} id={docid}> </DocumentListItem>)}
      </Box>
  );
}
