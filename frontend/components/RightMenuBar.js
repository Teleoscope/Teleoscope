import * as React from "react";
import { useState } from "react";
import PostList from "./PostList";
import useSWR, { mutate } from "swr";

// material ui
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

function useTeleoscope(id) {
  const { data, error } = useSWR(`/api/teleoscopes/${id}`, fetcher);
  return {
    teleoscope: data,
    loading: !error && !data,
    error: error,
  };
}

export default function RightMenuBar(props) {
  const [queries, setQueries] = useState([]);
  const [posts, setPosts] = useState([]);
  const [hover, setHover] = useState(false);
  const { teleoscope, loading, error } = useTeleoscope(
    "a2"
  );

  var data = teleoscope
    ? teleoscope.rank_slice.map((post) => {
        return [post, 1.0];
      })
    : []; // this is a hack

  const handleOpenPost = (id) => {
    var temp = [...posts];
    var i = temp.indexOf(id);
    if (i < 0) {
      temp.push(id);
    }
    setPosts(temp);
  };

  const handleClosePost = (id) => {
    var temp = [...posts];
    // console.log("temp1", temp, id)
    var i = temp.indexOf(id);
    temp.splice(i, 1);
    setPosts(temp);
    setHover(false);
    // console.log("temp2", temp, i)
  };

  const handleChildHover = (i) => {
    setHover(i);
  };

  var ids = posts;
  const handleIDs = (data) => {
    ids = data["rank_slice"];
    setPosts(ids);
  };

  return (
    <div className="rightMenuBar">
      <Box
        sx={{
          bgcolor: "background.paper",
          height: "100vh",
        }}
      >
        <div style={{ marginLeft: 50 }}>Recommended Documents</div>
        <PostList
          data={data}
          isFavList={true}
          isHideList={false}
          workspace={false}
          addItemToWorkSpace={props.addItemToWorkSpace}
        />
      </Box>
    </div>
  );
}
