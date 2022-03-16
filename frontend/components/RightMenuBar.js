import * as React from "react";
import { useState } from "react";
import SearchBar from "./SearchBar";
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
    "622bbaedb5a28808bd4c993f"
  );

  var data = teleoscope
    ? teleoscope.ranked_post_ids.map((post) => {
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
    ids = data["ranked_post_ids"];
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

        {/* <SearchBar queries={queries} handleIDs={handleIDs} />
        <PostList
          data={ids}
          handleOpenClick={handleOpenPost}
          handleCloseClick={handleClosePost}
          handleHover={handleChildHover}
          isFavList={true}
          isHideList={false}
          workspace={false}
          addItemToWorkSpace={props.addItemToWorkSpace}
        /> */}
      </Box>
    </div>
  );
}
