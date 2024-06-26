import { useState } from "react";

// mui
import SearchIcon from "@mui/icons-material/Search";
import { Stack, TextField, Box, Divider } from "@mui/material";

// actions
import { useDispatch } from "react-redux";
import { updateSearch } from "@/actions/appState";

// custom components
import DocumentList from "@/components/Documents/DocumentList";

// util
import ButtonActions from "@/components/ButtonActions";
import Count from "@/components/Count";
import { useSWRF } from "@/lib/swr";

export default function Search({id, windata, color}) {
  const [query, setQuery] = useState(windata?.query ? windata.query : "");

  const { data: documents, isLoading: documents_loading } = useSWRF(
    `search/${query}`
  );

  const { data: count, isLoading: count_loading } = useSWRF(
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
    dispatch(updateSearch({ search_id: windata.oid, query: e.target.value }));
  };

  

  return (
    <Stack direction="column" sx={{ height: "100%" }}>
      <Stack direction="row" alignItems="center" sx={{ margin: 1 }}>
        <SearchIcon
          sx={{ "&:hover": { color: color }, color: "#AAAAAA" }}
        />
        <TextField
          fullWidth
          placeholder={query ? query : "Search..."}
          sx={{
            "& .MuiInput-underline:after": { borderBottomColor: color },
          }}
          variant="standard"
          onChange={(e) => handleSetQuery(e)}
        />
      </Stack>
      <Divider></Divider>
      <ButtonActions inner={[[Count, {label: "Number of results", loading: count_loading, count: count}]]}></ButtonActions>
      <Box sx={{ flexGrow: 1, flexDirection: "column" }}>
        <DocumentList
          loading={documents_loading}
          pagination={true}
          data={[{id: id, ranked_documents: data}]}
          showGroupIcon={true}
        />
      </Box>
    </Stack>
  );
}
