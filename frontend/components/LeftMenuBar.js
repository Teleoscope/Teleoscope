import React, { useState, useContext } from "react";
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

// contexts
import { StompContext } from '../context/StompContext'

// global variables
let grouped_data = [];
//let grouped = filteredGroups !== undefined ? true : false;
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
  const filteredGroups = useSelector((state) => state.filters.value);
  const filterSelected = useSelector((state) => state.filters.selected);
  const dispatch = useDispatch();
  const [bookmarked, setBookmarked] = useState(false);
  const { posts, loading, error } = useQuery(search_term, true);
  const [value, setValue] = React.useState(null);
  const [open, toggleOpen] = React.useState(false);

  const client = useContext(StompContext)

  const setRandomColor = () => {
    const randomColor = Math.floor(Math.random() * 16777215).toString(16);
    // document.body.style.backgroundColor = "#" + randomColor;
    return "#" + randomColor;
  }

  const handleClose = () => {
    setDialogValue({
      label: '',
      color: '',
    });
    toggleOpen(false);
  };

  const [dialogValue, setDialogValue] = React.useState({
    label: '',
    color: '',
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setValue({
      label: dialogValue.label,
      color: parseInt(dialogValue.color, 10),
    });

    handleClose();
  };


  // this is a hard-coded hack for ranking of post_id
  let data = posts.map((post) => {
    return [post.id, 1.0];
  });

  // another hard-coded hack for ranking of post_id
  let bookmarked_data = bookmarks.map((post) => {
    return [post, 1.0];
  });



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

        {bookmarked && filterSelected ? (<PostList data={arrayUnique(bookmarked_data.concat(filteredGroups))} pagination={true} />) :
          (bookmarked ? (<PostList data={bookmarked_data} pagination={true} />) :
            (filterSelected ? (<PostList data={filteredGroups} pagination={true} />) :
              (<PostList data={data} pagination={true} />)))}
      </Box>
    </div >
  );

}



