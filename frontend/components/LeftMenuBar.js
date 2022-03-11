import * as React from "react";
import { useState } from "react";
import SearchBar from "../components/SearchBar";
import PostList from "../components/PostList";
import useSWR, { mutate } from "swr";

// material ui
import TextField from '@material-ui/core/TextField';
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";

// icons
import InboxIcon from "@mui/icons-material/Inbox";
import DraftsIcon from "@mui/icons-material/Drafts";
import ListItemIcon from "@mui/material/ListItemIcon";

const fetcher = (...args) => fetch(...args).then((res) => res.json());
function useQuery(q, shouldSend) {
  console.log("Line 41");
  const API_URL = shouldSend ? `http://localhost:3000/api/queries/${q}` : "";
  const { data, error } = useSWR(
    API_URL,
    fetcher
  );
  let ret = {
    posts: data ? data : [{"query":"_none"}],
    loading: !error && !data,
    error: error ? error : "",
  };
  return ret
}

export default function LeftMenuBar(props) {
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const {posts, loading, error} = useQuery(query, true);
  console.log("i am posts", query, posts)
  var data = posts.map((post) => {
    return [post.id, 1.0]
  });
  
  const keychange = (e) => {
    if (e.code == "Enter") {
      setQuery(text);
    }
  }

  return (
    <div className="leftMenuBar">
        <TextField 
          variant="filled" 
          label="queries" 
          placeholder="Add query..." 
          onKeyDown={(e) => keychange(e)}
          onChange={(e) => setText(e.target.value)}
        />
        <PostList
          data={data}
          isFavList={true}
          isHideList={false}
          workspace={false}
          addItemToWorkSpace={props.addItemToWorkSpace}
        />
    </div>
  );
}
