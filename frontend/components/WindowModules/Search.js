import React, { useState } from 'react';

// mui
import TextField from '@mui/material/TextField';

import SearchIcon from '@mui/icons-material/Search';
import LoadingButton from '@mui/lab/LoadingButton';
import Stack from '@mui/material/Stack';


// actions
import { useDispatch } from "react-redux";
import { updateWindow } from "../../actions/windows";

// custom components
import DocumentList from "../Documents/DocumentList"

// util
import useSWRAbstract from "../../util/swr"


export default function SearchWindow(props) {
  const [query, setQuery] = useState(" ");
  const { documents, documents_loading } = useSWRAbstract("documents", `/api/document/${query}`);
  const dispatch = useDispatch();

  // this is a hard-coded hack for ranking of document_id
  const data = documents ? documents.map((document) => { return [document._id, 1.0]; }) : [];

  const handleSetQuery = (e) => {
    setQuery(e.target.value);
    dispatch(updateWindow({ i: "%search", term: e.target.value }));
  }

  return (
    <div style={{ overflow: "auto", height: "100%", width: "100%"}}>
      <Stack direction="row" alignItems="center" sx={{margin:1}}>
        <SearchIcon sx={{ '&:hover': {color: props.color}, color: "#AAAAAA" }}/>
        <TextField 
          fullWidth
          placeholder="Search..."
          sx={{
            // '& .MuiInput-underline:before': { borderBottomColor: props.color },
            '& .MuiInput-underline:after': { borderBottomColor: props.color },
          }} variant="standard" onChange={(e) => handleSetQuery(e)}
        />
      </Stack>

      {documents_loading ? <LoadingButton loading={true} /> : <DocumentList pagination={true} data={data}></DocumentList>}
    </div>

  );
}