import * as React from "react";
import { useState } from "react";
import SearchBar from "./SearchBar";
import PostList from "./PostList";

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

export default function RightMenuBar(props) {
  const [queries, setQueries] = useState([]);
  const [posts, setPosts] = useState([]);
  const [hover, setHover] = useState(false);

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
          pagination={true}
        /> */}
      </Box>
    </div>
  );
}
