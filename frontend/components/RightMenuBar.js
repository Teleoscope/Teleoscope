import * as React from "react";
import { useState } from "react";
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

// actions
import { useSelector, useDispatch } from "react-redux";
import { activator } from "../actions/activeTeleoscopeID";

//utils
import useSWRAbstract from "../util/swr"

export default function RightMenuBar(props) {
  const teleoscope_id = useSelector((state) => state.activeTeleoscopeID.value);

  const { teleoscope, teleoscope_loading, teleoscope_error } = useSWRAbstract("teleoscope", `/api/teleoscopes/${teleoscope_id}`);
  var data = [];
  if (teleoscope) {
    var history = teleoscope["history"];
    var h_item = history[history.length - 1];
    console.log("teleoscope history",teleoscope, history, h_item)
    data = h_item["rank_slice"];
    
  }
  return (
    <div className="rightMenuBar">
      <Box
        sx={{
          bgcolor: "background.paper",
          height: "100vh",
        }}
      >

        <div
          style={{
            height: 56,
            marginLeft: 50,
          }}
        >
          Recommended Documents
        </div>
        <hr />
        <PostList
          data={data}
          workspace={false}
        />
      </Box>
    </div>
  );
}
