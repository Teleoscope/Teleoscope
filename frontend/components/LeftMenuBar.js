import React, { useState } from "react";
import PostList from "../components/PostList";
import useSWR from "swr";

// material ui
import TextField from "@material-ui/core/TextField";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import AddIcon from '@mui/icons-material/Add';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';

// actions
import { useSelector, useDispatch } from "react-redux";
import { searcher } from "../actions/searchterm";
import { addGroup } from "../actions/groups";
import { unstable_composeClasses } from "@mui/material";


const filter = createFilterOptions();
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
  const labels = useSelector((state) => state.grouper.groups);
  const dispatch = useDispatch();
  const [bookmarked, setBookmarked] = useState(false);
  const [text, setText] = useState("");
  const { posts, loading, error } = useQuery(search_term, true);
  const [value, setValue] = React.useState(null);
  const [open, toggleOpen] = React.useState(false);

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

  const groupDataMaker = (groupName) => {
    let filteredGroups = groups.filter(posts => posts.label === groupName);
    return !filteredGroups ? (
      "There is no posts that fit the selected filters")
      : (filteredGroups.map((posts) => {
        return [posts.id, 1.0];
      }))
  }

const bookmarkToggler = (e) => {
  bookmarked = !bookmarked;
  console.log(bookmarked);
};

const keyChange = (e) => {
  if (e.code == "Enter") {
    dispatch(searcher(text));
  }
};

  const onChangeHandler = (event, newValue) => {
    if (typeof newValue === 'object' && newValue !== null && !newValue.label.includes("Add")) {
      grouped_data = groupDataMaker(newValue.label);
      grouped = true;
    } else {
      grouped = false;
    }

    if (typeof newValue === 'string') {
      // timeout to avoid instant validation of the dialog's form.
      // TODO: seems like a bit of a hack, what behaviour is being suppressed here?
      // is there another way to modify it?
      setTimeout(() => {
        toggleOpen(true);
        setDialogValue({
          label: newValue,
          color: '',
        });
      });
    } else if (newValue && newValue.inputValue) {
      toggleOpen(true);
      setDialogValue({
        label: newValue.inputValue,
        color: '',
      });
    } else {
      setValue(newValue);
    }
  }

  return (
    <div className="leftMenuBar">
      <Box
        sx={{
          width: "100%",
          bgcolor: "background.paper",
          height: "100vh",
        }}
      >
        <TextField
          variant="filled"
          label="Search posts..."
          placeholder="Add query..."
          onKeyDown={(e) => keyChange(e)}
          onChange={(e) => setText(e.target.value)}
          style={{ width: "100%", borderRadius: "0 !important" }}
        />
        {/* TODO: if we're seeing react fragments, it might be best to refactor.
          Suggest moving this into a separate component and rethinking the logic here.
          Similarly, I'm seeing  a lot of repeated code, so probably best to see what
          kind of abstraction is possible.
         */}
        <React.Fragment>
          <Autocomplete
            value={value}
            onChange={(event, newValue) => {
              onChangeHandler(event, newValue)
            }}
            filterOptions={(options, params) => {
              const filtered = filter(options, params);

              if (params.inputValue !== '') {
                filtered.push({
                  inputValue: params.inputValue,
                  label: `Add "${params.inputValue}"`,
                });
              }

              return filtered;
            }}
            id="Add Group"
            options={Object.keys(labels)}
            getOptionLabel={(option) => {
              // e.g value selected with enter, right from the input
              if (typeof option === 'string') {
                return option;
              }
              if (option.inputValue) {
                // if the user is typing then populate the text field with what they are typing 
                return option.inputValue;
              }
              return option.label;
            }}
            style={{ width: "100%", borderRadius: "0 !important" }}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            renderOption={(props, option) => <li {...props}>{option.label}</li>}
            sx={{ width: 300 }}
            freeSolo
            renderInput={(params) =>
              <TextField {...params}
                label="Post groups..."
                variant="filled"
                placeholder="type to create, click to filter..."
                onKeyDown={(e) => keyChange(e)}
                style={{ width: "100%", borderRadius: "0 !important" }} />}
          />
          <Dialog open={open} onClose={handleClose}>
            <form onSubmit={handleSubmit}>
              <DialogTitle>Add a new group</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  Input your group name and a random color will be matched to the group!
                </DialogContentText>
                <TextField
                  variant="filled"
                  placeholder="Add group name"
                  style={{ width: "100%", borderRadius: "0 !important" }}
                  autoFocus
                  margin="dense"
                  id="name"
                  value={dialogValue.label}
                  onChange={(event) =>
                    setDialogValue({
                      ...dialogValue,
                      tag: event.target.value,
                    })
                  }
                  label="group name"
                  type="text"
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                  type="submit"
                  onClick={() => {
                    dispatch(addGroup({ label: dialogValue.label, color: setRandomColor() }))
                  }}>Add</Button>
              </DialogActions>
            </form>
          </Dialog>
        </React.Fragment>



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



