/* eslint-disable no-use-before-define */
import React from 'react';
import useSWR, { mutate } from "swr";

// material ui
import Chip from '@material-ui/core/Chip';
import Autocomplete from '@material-ui/lab/Autocomplete';
import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import CircularProgress from '@material-ui/core/CircularProgress';

// icons
import DoneIcon from '@material-ui/icons/Done';


const useStyles = makeStyles((theme) => ({
  root: {
    // width: 500,
    marginBottom: theme.spacing(2),
    '& > * + *': {
      marginTop: theme.spacing(3),
    },
  },
}));

const fetcher = (...args) => fetch(...args).then((res) => res.json());
function useQueries(q) {
  const { data, error } = useSWR(
    `http://localhost:3000/api/queries/`,
    fetcher
  );
  var ret = {
    queries: data ? data : [{"query":"_none"}],
    loading: !error && !data,
    error: error,
  };
  return ret
}

function useQuery(q) {
  const { data, error } = useSWR(
    `http://localhost:3000/api/queries/?${q}`,
    fetcher
  );
  var ret = {
    query: data ? data : [{"query":"_none"}],
    // loading: !error && !data,
    // error: error,
  };
  return ret
}



export default function Tags(props) {
  const classes = useStyles();
  const {queries, loading, error} = useQueries()
  
  const done = (query) => {
  var ids = queries.map((q) => {return q.query})
  var i = ids.indexOf(query)
  return i > -1 ? true : false
}

  return (
      <Autocomplete
        className={classes.root}
        multiple
        id="tags-filled"
        options={queries.map((option) => option.query)}
        defaultValue={props.queries.map((q) => (q))}
        freeSolo
        size="small"
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip 
              icon={done(option) ? <DoneIcon /> : <CircularProgress color="inherit" size={10} />}
              size="small"
              variant="outlined" 
              label={option} {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => (
          <TextField {...params} variant="filled" label="queries" placeholder="Add query..." />
        )}
      />
  );
}

