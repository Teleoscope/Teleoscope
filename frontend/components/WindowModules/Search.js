import React, { useState, useContext } from "react";

// mui
import SearchIcon from "@mui/icons-material/Search";
import { Stack, Divider, TextField, Box } from "@mui/material";

// actions
import { useDispatch } from "react-redux";
import { updateWindow } from "@/actions/windows";

// custom components
import DocumentList from "../Documents/DocumentList";

// util
import { swrContext } from "@/util/swr";

export default function SearchWindow(props) {
  const [query, setQuery] = useState(" ");
  const swr = useContext(swrContext);
  const { documents, documents_loading } = swr.useSWRAbstract(
    "documents",
    `search/${query}`
  );
  const dispatch = useDispatch();

  // this is a hard-coded hack for ranking of document_id
  const data = documents
    ? documents.map((document) => {
        return [document._id, 1.0];
      })
    : [];

  const handleSetQuery = (e) => {
    setQuery(e.target.value);
    dispatch(updateWindow({ i: "%search", term: e.target.value }));
  };

  return (
    <Stack direction="column" sx={{ height: "100%" }}>
      <Stack direction="row" alignItems="center" sx={{ margin: 1}}>
        <SearchIcon
          sx={{ "&:hover": { color: props.color }, color: "#AAAAAA" }}
        />
        <TextField
          fullWidth
          placeholder="Search..."
          sx={{
            // '& .MuiInput-underline:before': { borderBottomColor: props.color },
            "& .MuiInput-underline:after": { borderBottomColor: props.color },
          }}
          variant="standard"
          onChange={(e) => handleSetQuery(e)}
        />
      </Stack>
      <Box sx={{ flexGrow: 1, flexDirection: "column", margin: "2px"}}>
        <DocumentList
          loading={documents_loading}
          pagination={true}
          data={data}
        />
      </Box>
    </Stack>
  );
}
