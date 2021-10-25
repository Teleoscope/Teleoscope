/* eslint-disable no-use-before-define */
import {React, useState } from 'react';
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
    `/api/queries/`,
    fetcher
  );
  var ret = {
    queries: data ? data : [{"query":"_none"}],
    loading: !error && !data,
    error: error,
  };
  return ret
}

function useQuery(q, shouldSend) {
  console.log("Line 41");
  const API_URL = shouldSend ? `http://localhost:3000/api/queries/${q}` : "";
  const { data, error } = useSWR(
    API_URL,
    fetcher
  );
  let ret = {
    queries: data ? data : [{"query":"_none"}],
    loading: !error && !data,
    error: error ? error : "",
  };
  return ret
}

const makeQuery = (q, shouldSend) => {
  console.log("making query to backend");
  const API_URL = shouldSend ? `http://localhost:8080/?query=${q}&sims`;
  const { data, error } = useSWR(
    API_URL, 
    fetcher
  );
  if (data != null && "bad" in data) {
    return 0;
  }

  let ret = {
      queries: data ? data : [{"query": "_none"}]
  }

}

// TODO: define async callback for the task/query server
// may be able to use the fetcher ^^ above, i.e., const fetcher = (...args) => fetch(...args).then((res) => res.json());
// or define another react hook such as useQueries()
// e.g.:

// function useFavs(query, list) {
//   var ids = list.join("+");
//   var url = false
//   if (list.length > 0) {
//     url = `http://localhost:8080/?query=${query}\&sims=${ids}\&`
//   }
//   const { data, error } = useSWR(url, fetcher);
//   return {
//     sdata: data,
//     serror: error,
//   };
// }

// Note that we'll need some kind of data validation on the task server and some way to
// stop this end from spamming the task server.


/* 
SearchBar

The SearchBar populates a DocSet with queries. The (in-progress) concept is
that the user searches for a term here, which registers a query-building task 
with RabbitMQ. A Celery Worker will then consume it, building the NLP indices
using all of the docs that the query term returns from a MongoDB text search.

TODO: decide how to manage queries with multiple search terms. Previously, we used
a logical OR for the terms. We may want to generate three separate queries as well as
the logical OR'd term. Likely should be handled not here but on the task server.

*/
export default function SearchBar(props) {
  const classes = useStyles();
  const [shouldSendQuery, setShouldSendQuery] = useState(false);
  const [query, setQuery] = useState("");
  const {queries, loading, error} = useQuery(query, shouldSendQuery);

  
  const done = (query) => {
    if (loading) return false;

    console.log("handling ids");
    props.handleIDs(queries);
    console.log(shouldSendQuery);
    return true;
  }

  // TODO: add onChange callback here, example code below
  // Effect: sends a query request to the task/query server
  // which eventually builds indices out of the query docs
  
  // const handleChange = ( x, y, z ) => {
        // ... do something with the queries
        // such as make an async request to the task/query server
        // you may have to create some logic for handling queries that
        // have already loaded, deleting queries, etc. that 
        // interacts with the parent component
  // }


  const handleSubmit = (q) => {
    console.log(q);
    if (!q) return;
    setShouldSendQuery(true);
    setQuery(q, shouldSendQuery);
  }
    

  return (
      <Autocomplete
        className={classes.root}
        multiple
        id="tags-filled"
        options={props.queries.map((option) => "test")}
        defaultValue={props.queries.map((q) => (q))}
        freeSolo
        size="small"
        onChange={(e) => handleSubmit(e.target.value)}
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

