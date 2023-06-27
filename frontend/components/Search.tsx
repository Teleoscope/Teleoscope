import React, { useState, useContext } from "react";

// mui
import SearchIcon from "@mui/icons-material/Search";
import { Stack, TextField, Box, Typography } from "@mui/material";

// actions
import { useDispatch } from "react-redux";
import { updateSearch } from "@/actions/windows";

// custom components
import DocumentList from "@/components/Documents/DocumentList";

// util
import { swrContext } from "@/util/swr";
import ButtonActions from "@/components/ButtonActions";

export default function Search(props) {
  const [query, setQuery] = useState(props.windata?.query ? props.windata.query : "");
  const swr = useContext(swrContext);
  const { documents, documents_loading } = swr.useSWRAbstract(
    "documents",
    `search/${query}`
  );

  const { count, count_loading } = swr.useSWRAbstract(
    "count",
    `count/${query}`
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
    dispatch(updateSearch({ id: props.id, term: e.target.value }));
  };

  const Count = () => (
    <Typography sx={{ width: "100%" }} align="center" variant="caption">
      Results {count_loading ? "loading..." : `: ${count}`}
    </Typography>
  );

  return (
    <Stack direction="column" sx={{ height: "100%" }}>
      <Stack direction="row" alignItems="center" sx={{ margin: 1 }}>
        <SearchIcon
          sx={{ "&:hover": { color: props.color }, color: "#AAAAAA" }}
        />
        <TextField
          fullWidth
          placeholder={query ? query : "Search..."}
          sx={{
            // '& .MuiInput-underline:before': { borderBottomColor: props.color },
            "& .MuiInput-underline:after": { borderBottomColor: props.color },
          }}
          variant="standard"
          onChange={(e) => handleSetQuery(e)}
        />
      </Stack>
      <ButtonActions inner={[[Count, {}]]}></ButtonActions>
      <Box sx={{ flexGrow: 1, flexDirection: "column" }}>
        <DocumentList
          loading={documents_loading}
          pagination={true}
          data={data}
          showGroupIcon={true}
        />
      </Box>
    </Stack>
  );
}
