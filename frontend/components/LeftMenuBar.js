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

const fetcher = (...args) => fetch(...args).then((res) => res.json());
const filter = createFilterOptions();

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

export default function LeftMenuBar(props) {
  const search_term = useSelector((state) => state.searchTerm.value);
  const bookmarks = useSelector((state) => state.bookmarker.value);
  const tags = useSelector((state) => state.tagger.value);
  const dispatch = useDispatch();
  const [bookmarked, setBookmarked] = useState(false);
  const [tagged, setTagged] = useState(false);

  const [text, setText] = useState("");
  const { posts, loading, error } = useQuery(search_term, true);
  const [value, setValue] = React.useState(null);
  const [open, toggleOpen] = React.useState(false);

  const handleClose = () => {
    setDialogValue({
      title: '',
      year: '',
    });

    toggleOpen(false);
  };

  const [dialogValue, setDialogValue] = React.useState({
    title: '',
    year: '',
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setValue({
      title: dialogValue.title,
      year: parseInt(dialogValue.year, 10),
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

  let tagged_data = tags.map((post) => {
    return [post.id, 1.0];
  });

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
              if (typeof newValue === 'string') {
                // timeout to avoid instant validation of the dialog's form.
                setTimeout(() => {
                  toggleOpen(true);
                  setDialogValue({
                    title: newValue,
                    year: '',
                  });
                });
              } else if (newValue && newValue.inputValue) {
                toggleOpen(true);
                setDialogValue({
                  title: newValue.inputValue,
                  year: '',
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
                  title: `Add "${params.inputValue}"`,
                });
              }

              return filtered;
            }}
            id="Add Tag"
            options={top100Films}
            getOptionLabel={(option) => {
              // e.g value selected with enter, right from the input
              if (typeof option === 'string') {
                return option;
              }
              if (option.inputValue) {
                return option.inputValue;
              }
              return option.title;
            }}
            style={{ width: "100%", borderRadius: "0 !important" }}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            renderOption={(props, option) => <li {...props}>{option.title}</li>}
            sx={{ width: 300 }}
            freeSolo
            renderInput={(params) => 
            <TextField {...params} 
              label="tags" 
              variant="filled"
              placeholder="Add or Search tag..."
              onKeyDown={(e) => keyChange(e)}
              style={{ width: "100%", borderRadius: "0 !important" }}/>}
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
                  //onKeyDown={(e) => keyChange(e)}
                  //onChange={(e) => setText(e.target.value)}
                  style={{ width: "100%", borderRadius: "0 !important" }}
                  autoFocus
                  margin="dense"
                  id="name"
                  value={dialogValue.title}
                  onChange={(event) =>
                    setDialogValue({
                      ...dialogValue,
                      title: event.target.value,
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
                  id="name"
                  type="color"
                  value={dialogValue.year}
                  onChange={(event) =>
                    setDialogValue({
                      ...dialogValue,
                      year: event.target.value,
                    })
                  }
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button type="submit">Add</Button>
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
        {/* <FormControlLabel
          style={{ marginLeft: 20, marginTop: 10 }}
          control={<Checkbox style={{ marginRight: 10 }} />}
          onChange={() => setTagged(!tagged)}
          label="Tagged Items Only"
        /> */}

        {bookmarked ? (<PostList data={bookmarked_data} pagination={true} />) : <PostList data={data} pagination={true} />}
        {/* {tagged ? (<PostList data={tagged_data} pagination={true} />) : (<PostList data={data} pagination={true} />)} */}
      </Box>
    </div >
  );
}

const top100Films = [
  { title: 'The Shawshank Redemption', year: 1994 }]
