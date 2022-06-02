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
import { tag } from "../actions/tagged";

const fetcher = (...args) => fetch(...args).then((res) => res.json());
const filter = createFilterOptions();
let tagged_data = [];
let tagged = false;

function useQuery(q, shouldSend) {
  const API_URL = shouldSend ? `/api/cleanposts/${q}` : "";
  const { data, error } = useSWR(API_URL, fetcher);
  let ret = {
    posts: data ? data : [{ query: "_none" }],
    loading: !error && !data,
    error: error ? error : "",
  };
  return ret;
}

function arrayUnique(array) {
  var a = array.concat();
  for(var i=0; i<a.length; ++i) {
      for(var j=i+1; j<a.length; ++j) {
          if(a[i].id === a[j].id)
              a.splice(j--, 1);
      }
  }

  return a;
}

export default function LeftMenuBar(props) {
  const search_term = useSelector((state) => state.searchTerm.value);
  const bookmarks = useSelector((state) => state.bookmarker.value);
  const tags = useSelector((state) => state.tagger.value);
  const dispatch = useDispatch();
  const [bookmarked, setBookmarked] = useState(false);
  //const [tagged, setTagged] = useState(false);

  const [text, setText] = useState("");
  const { posts, loading, error } = useQuery(search_term, true);
  const [value, setValue] = React.useState(null);
  const [open, toggleOpen] = React.useState(false);

  const handleClose = () => {
    setDialogValue({
      id: '',
      tag: '',
      color: '',
    });

    toggleOpen(false);
  };

  const [dialogValue, setDialogValue] = React.useState({
    id: '',
    tag: '',
    color: '',
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setValue({
      tag: dialogValue.tag,
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

  const tagDataMaker = (tagName) => {
    let filteredTags = tags.filter(posts => posts.tag === tagName);
    return filteredTags.map((posts) => {
      return [posts.id, 1.0];
    })
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
          label="cleanposts"
          placeholder="Add query..."
          onKeyDown={(e) => keyChange(e)}
          onChange={(e) => setText(e.target.value)}
          style={{ width: "100%", borderRadius: "0 !important" }}
        />
        <React.Fragment>
          <Autocomplete
            value={value}
            onChange={(event, newValue) => {

              if (typeof newValue === 'object' && newValue !== null) {
                tagged_data = tagDataMaker(newValue.tag);
                //<PostList data={tagDataMaker(newValue.tag)} pagination={true} />
                tagged = true;
              } else {
                tagged = false;
              }

              if (typeof newValue === 'string') {
                // timeout to avoid instant validation of the dialog's form.
                setTimeout(() => {
                  toggleOpen(true);
                  setDialogValue({
                    id: '',
                    tag: newValue,
                    color: '',
                  });
                });
              } else if (newValue && newValue.inputValue) {
                toggleOpen(true);
                setDialogValue({
                  id: '',
                  tag: newValue.inputValue,
                  color: '',
                });
              } else {
                setValue(newValue);
              }
            }}
            filterOptions={(options, params) => {
              const filtered = filter(options, params);

              if (params.inputValue !== '') {
                filtered.push({
                  inputValue: params.inputValue,
                  tag: `Add "${params.inputValue}"`,
                });
              }

              return filtered;
            }}
            id="Add Tag"
            options={userTags}
            getOptionLabel={(option) => {
              // e.g value selected with enter, right from the input
              if (typeof option === 'string') {
                return option;
              }
              if (option.inputValue) {
                // if the user is typing then populate the text field with what they are typing 
                return option.inputValue;
              }
              return option.tag;
            }}
            style={{ width: "100%", borderRadius: "0 !important" }}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            renderOption={(props, option) => <li {...props}>{option.tag}</li>}
            sx={{ width: 300 }}
            freeSolo
            renderInput={(params) =>
              <TextField {...params}
                label="tags"
                variant="filled"
                placeholder="Add or Search tag..."
                onKeyDown={(e) => keyChange(e)}
                style={{ width: "100%", borderRadius: "0 !important" }} />}
          />
          <Dialog open={open} onClose={handleClose}>
            <form onSubmit={handleSubmit}>
              <DialogTitle>Add a new tag</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  Input your tag name and select a color to represent that tag!
                </DialogContentText>
                <TextField
                  variant="filled"
                  placeholder="Add tag name"
                  style={{ width: "100%", borderRadius: "0 !important" }}
                  autoFocus
                  margin="dense"
                  id="name"
                  value={dialogValue.tag}
                  onChange={(event) =>
                    setDialogValue({
                      ...dialogValue,
                      tag: event.target.value,
                    })
                  }
                  label="tag name"
                  type="text"
                />
                <TextField
                  variant="filled"
                  label="color"
                  placeholder="Add query..."
                  onKeyDown={(e) => keyChange(e)}
                  style={{ width: "100%", borderRadius: "0 !important" }}
                  margin="dense"
                  id="color"
                  type="color"
                  value={dialogValue.color}
                  onChange={(event) =>
                    setDialogValue({
                      ...dialogValue,
                      color: event.target.value,
                    })
                  }
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                  type="submit"
                  onClick={() => {
                    userTags.push({ id: '', tag: document.getElementById('name').value, color: document.getElementById('color').value })
                  }}>Add</Button>
              </DialogActions>
            </form>
          </Dialog>
        </React.Fragment>


        <FormControlLabel
          style={{ marginLeft: 20, marginTop: 10 }}
          control={<Checkbox style={{ marginRight: 10 }} />}
          onChange={() => setBookmarked(!bookmarked)}
          label="Bookmarked Items Only"
        />

        {bookmarked && tagged ? (<PostList data={arrayUnique(bookmarked_data.concat(tagged_data))} pagination={true} />) :
          (bookmarked ? (<PostList data={bookmarked_data} pagination={true} />) :
            (tagged ? (<PostList data={tagged_data} pagination={true} />) :
              (<PostList data={data} pagination={true} />)))}
      </Box>
    </div >
  );
}

export var userTags = [
  { id: '', tag: 'Red', color: 'red' },
  { id: '', tag: 'Blue', color: 'blue' },
  { id: '', tag: 'Green', color: 'green' }]


