import React, { useState } from "react";
import PostList from "../components/PostList";
import useSWR from "swr";

// material ui
import TextField from "@material-ui/core/TextField";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

const fetcher = (...args) => fetch(...args).then((res) => res.json());

function useQuery(q, shouldSend) {
  const API_URL = shouldSend ? `http://localhost:3000/api/cleanposts/${q}` : "";
  const { data, error } = useSWR(API_URL, fetcher);
  let ret = {
    posts: data ? data : [{ query: "_none" }],
    loading: !error && !data,
    error: error ? error : "",
  };
  return ret;
}

export default function LeftMenuBar(props) {
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const { posts, loading, error } = useQuery(query, true);

  // this is a hard-coded hack for ranking of post_id
  let data = posts.map((post) => {
    return [post.id, 1.0];
  });

  const keyChange = (e) => {
    if (e.code == "Enter") {
      setQuery(text);
    }
  };

  return (
    <div className="leftMenuBar">
      <Box
        sx={{
          width: "100%",
          maxWidth: 360,
          bgcolor: "background.paper",
          height: "100vh",
        }}
      >
        <TextField
          variant="filled"
          label="cleanposts"
          placeholder="Add query..."
          onKeyDown={(e) => keyChange(e)}
          onChange={(e) => setText(e.target.value)}
          style={{ width: "100%" }}
        />
        <FormControlLabel
          style={{ marginLeft: 20, marginTop: 10 }}
          control={<Checkbox style={{ marginRight: 10 }} />}
          label="Bookmarked Items Only"
        />
        <PostList
          data={data}
          pagination={true}
        />
      </Box>
    </div>
  );
}
