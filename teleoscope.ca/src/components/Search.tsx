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
import { WindowProps } from "./WindowFolder/WindowFactory";
import { useAppSelector } from "@/lib/hooks";
import { RootState } from "@/lib/store";

export default function Search({ data: search, reactflow_node, graph_node }: WindowProps) {
  const [query, setQuery] = useState(search?.query ? search.query : "");
  const { _id: workspace } = useAppSelector((state: RootState) => state.appState.workspace);
  const { data: documents, isLoading: documents_loading } = useSWRF(
    `/api/search?query=${query}&workspace=${workspace}`
  );

  const { data: count, isLoading: count_loading } = useSWRF(
    `/api/count?query=${query}`
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
    dispatch(updateSearch({ search_id: reactflow_node.oid, query: e.target.value }));
  };

  const { color } = useAppSelector((state: RootState) => state.appState.workflow.settings.color);

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
          data={[{id: reactflow_node.id, ranked_documents: data}]}
          showGroupIcon={true}
        />
      </Box>
    </Stack>
  );
}
