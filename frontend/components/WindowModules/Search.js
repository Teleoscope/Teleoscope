import React, { useState } from 'react';
import PropTypes from 'prop-types';

// mui
import TextField from '@mui/material/TextField';

import Input from '@mui/material/Input';
import SearchIcon from '@mui/icons-material/Search';
import LoadingButton from '@mui/lab/LoadingButton';
import Stack from '@mui/material/Stack';


// actions
import { useSelector, useDispatch } from "react-redux";
import { updateWindow } from "../../actions/windows";

// custom components
import PostList from "../Posts/PostList"
import CloseButton from "../CloseButton"

// util
import useSWRAbstract from "../../util/swr"


export default function SearchWindow(props) {
  const [query, setQuery] = useState(" ");
  const { posts, posts_loading } = useSWRAbstract("posts", `/api/cleanposts/${query}`);
  const dispatch = useDispatch();

  // this is a hard-coded hack for ranking of post_id
  const data = posts ? posts.map((post) => { return [post.id, 1.0]; }) : [];

  const handleSetQuery = (e) => {
    setQuery(e.target.value);
    dispatch(updateWindow({ i: "%search", term: e.target.value }));
  }

  return (
    <div style={{ overflow: "auto", height: "100%", width: "100%"}}>
      <Stack direction="row" alignItems="center" sx={{margin:1}}>
        <SearchIcon sx={{ color: props.color }}/>
        <TextField 
          fullWidth
          placeholder="Search..."
          sx={{
            '& .MuiInput-underline:before': { borderBottomColor: props.color },
            '& .MuiInput-underline:after': { borderBottomColor: props.color },
          }} variant="standard" onChange={(e) => handleSetQuery(e)}
        />
      </Stack>

      {posts_loading ? <LoadingButton loading={true} /> : <PostList pagination={true} data={data}></PostList>}
    </div>

  );
}