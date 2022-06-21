import React, { useState } from "react";
import PostList from "../components/PostList";
import useSWR from "swr";

// material ui
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

// actions
import { useSelector, useDispatch } from "react-redux";
import { unstable_composeClasses } from "@mui/material";

// customs 
import LeftMenuBarSearch from "./LeftMenuBarSearch";
import LeftMenuBarGroups from "./LeftMenuBarGroups";

// global variables
let grouped_data = [];
let grouped = false;

function useQuery(q, shouldSend) {
  const API_URL = shouldSend ? `/api/cleanposts/${q}` : "";
  const { data, error } = useSWR(API_URL);
  let ret = {
    posts: data ? data : [{ query: "_none" }],
    loading: !error && !data,
    error: error ? error : "",
  };
  return ret;
}

function arrayUnique(array) {
  console.log(array)
  var a = array.concat();
  for (var i = 0; i < a.length; ++i) {
    for (var j = i + 1; j < a.length; ++j) {
      if (a[i][0] === a[j][0]) {
        a.splice(j--, 1);
      }
    }
  }

  return a;
}

export default function LeftMenuBar(props) {
  const search_term = useSelector((state) => state.searchTerm.value);
  const bookmarks = useSelector((state) => state.bookmarker.value);
  const groups = useSelector((state) => state.grouper.value);
  const dispatch = useDispatch();
  const [bookmarked, setBookmarked] = useState(false);
  const { posts, loading, error } = useQuery(search_term, true);


  // this is a hard-coded hack for ranking of post_id
  let data = posts.map((post) => {
    return [post.id, 1.0];
  });

  // another hard-coded hack for ranking of post_id
  let bookmarked_data = bookmarks.map((post) => {
    return [post, 1.0];
  });

  // const groupDataMaker = (groupName) => {
  //   let filteredGroups = groups.filter(posts => posts.label === groupName);
  //   return !filteredGroups ? (
  //     "There is no posts that fit the selected filters")
  //     : (filteredGroups.map((posts) => {
  //       return [posts.id, 1.0];
  //     }))
  // }

  // const bookmarkToggler = (e) => {
  //   bookmarked = !bookmarked;
  //   console.log(bookmarked);
  // };


  return (
    <div className="leftMenuBar">
      <Box
        sx={{
          width: "100%",
          bgcolor: "background.paper",
          height: "100vh",
        }}
      >
        <LeftMenuBarSearch />
        <LeftMenuBarGroups />
        
        <FormControlLabel
          style={{ marginLeft: 0, marginTop: 0 }}
          control={<Checkbox style={{ marginRight: 0 }} />}
          onChange={() => setBookmarked(!bookmarked)}
          label="Bookmarked Items Only"
        />

        {bookmarked && grouped ? (<PostList data={arrayUnique(bookmarked_data.concat(grouped_data))} pagination={true} />) :
          (bookmarked ? (<PostList data={bookmarked_data} pagination={true} />) :
            (grouped ? (<PostList data={grouped_data} pagination={true} />) :
              (<PostList data={data} pagination={true} />)))}
      </Box>
    </div >
  );

}



