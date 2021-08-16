import React from "react";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import Draggable from "react-draggable";

// custom components
import QueryList from "../components/QueryList";            /////////////
import QueryBar from "../components/QueryBar";            /////////////
import StoryCard from "../components/StoryCard";

// material ui components
import { makeStyles } from "@material-ui/core/styles";
import Divider from "@material-ui/core/Divider";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import Fade from "@material-ui/core/Fade";
import LinearProgress from "@material-ui/core/LinearProgress";
import Slider from "@material-ui/core/Slider";

// icons
import CancelIcon from "@material-ui/icons/Cancel";

const useStyles = makeStyles((theme) => ({
  root: {
    // padding: '2px 4px',
    // display: 'flex',
    // alignItems: 'center',
    // width: 200,
    maxWidth: 300,
  },
  input: {
    // marginLeft: theme.spacing(1),
    flex: 1,
    fontSize: 18,
    color: "#000000",
  },
  iconButton: {
    padding: 10,
  },
  divider: {
    height: 28,
    margin: 4,
  },
  bullet: {
    display: "inline-block",
    margin: "0 2px",
    transform: "scale(0.8)",
  },
  title: {
    fontSize: 14,
  },
  pos: {
    marginBottom: 12,
  },
  icon: {
    "&:hover": {
      color: "#f00",
    },
  },
}));

const fetcher = (...args) => fetch(...args).then((res) => res.json());

function validate(q) {
  var valid =
    typeof q === "object" &&
    q !== null &&
    Object.prototype.hasOwnProperty.call(q, "ranked_post_ids");
  return valid;
}

function useCalc(q) {
  const { data, error } = useSWR(
    `http://localhost:3000/api/queries/${q}`,
    fetcher
  );
  return {
    qret: data,
    qisLoading: !error && !data,
    qisError: error,
    qisGoodResult: validate(data),
  };
}

function useFavs(query, list) {           /////////////
  var ids = list.join("+");
  var url = false
  if (list.length > 0) {
    url = `http://localhost:8080/?query=${query}\&sims=${ids}\&`            /////////////
  }
  const { data, error } = useSWR(url, fetcher);
  return {
    sdata: data,
    serror: error,
  };
}


export default function DocSet(props) {
  if (!props.show) {
    return null;
  }

  const classes = useStyles();

  const [query, setQuery] = useState("");           /////////////

  const [send, setSend] = useState(false);
  const [res, setRes] = useState({});
  const [clicked, setClicked] = useState(false);
  const [hover, setHover] = useState(false);
  const [alignment, setAlignment] = React.useState("left");
  const [postid, setPostID] = useState("");
  const [posts, setPosts] = useState([]);
  const [favs, setFavs] = useState([]);
  const { sdata, serror } = useFavs(query, props.sims);           /////////////
  const { qret, qisLoading, qisError, qisGoodResult } = useCalc(query);           /////////////

  const { data, error } = useSWR(
    `http://localhost:3000/api/counts/${query}`,            /////////////
    fetcher
  );


  const handleText = (id) => {
    var temp = [...posts];
    var i = temp.findIndex((e) => e.postid == id);
    console.log(id, i);
    if (i >= 0) {
      temp[i].show = true;
    } else {
      temp.push({ postid: id, show: true });
    }
    console.log(temp)
    setPosts(temp);
  };


  const handleFav = (id, fav) => {
    var temp = [...favs];
    if (fav && !temp.includes(id)) {
      temp.push(id);
    }
    if (!fav && temp.includes(id)) {
      temp = temp.filter((i) => i !== id);
    }
    setFavs(temp);
    console.log("query temp", temp)           /////////////
    props.setGlobalFavs(query, temp)            /////////////
  };

  const handlePostClose = (id) => {
    var temp = [...posts];
    console.log(temp);
    var i = temp.findIndex((e) => e.postid == id);
    temp[i].show = false;
    setPosts(temp);
  };


  const handleChildHover = (e) => {
    setHover(e)
  }

  const postlist = (ps) => (
    <div>
    {ps.map((m, i) =>
          m.show ? (
            <StoryCard
              key={m.postid + "storycard"}
              postid={m.postid}
              close={handlePostClose}
              fav={handleFav}
              hover={handleChildHover}
              zind={i}
            />
          ) : null
        )}
      </div>
    )

  const toggleDocList = (event, newAlignment) => {
    setAlignment(newAlignment);
  };
  const handleSliderUpdate = (s) => {
    setValue(s);
  };
  const handleUpdate = (q) => {
    setQuery(q);            /////////////
  };
  const handleClose = () => {
    props.close(props.index);
  };

  const docArrow = () => <div></div>;

  return (
    <Draggable
      grid={[20, 20]}
      bounds="parent"
      defaultPosition={{ x: 200, y: 200 }}
      disabled={hover}
    >
    <div className={classes.root}>
      <Card style={{ zIndex: props.index }}>

        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={7}>
              <Typography
                className={classes.title}
                color="textSecondary"
                gutterBottom
              >
                {data ? data : "Loading"} documents
              </Typography>
            </Grid>
            <Grid item xs={3}>
              {data && qisGoodResult && clicked ? docArrow() : null}
            </Grid>
            <Grid item xs={2}>
              <CancelIcon
                color="disabled"
                className={classes.icon}
                onClick={handleClose}
              />
            </Grid>
          </Grid>
          <Divider />
          <div
            onMouseEnter={() => {
              setHover(true);
            }}
            onMouseLeave={() => {
              setHover(false);
            }}
          >
            <QueryBar           /////////////
              query={query}           /////////////
              updateCallback={handleUpdate}
              goodResult={qisGoodResult}
              clicked={clicked}
            />
            {qisGoodResult && qret && clicked ? (
              <QueryList handleText={handleText} data={qret} />           /////////////
            ) : null}
            {clicked && !qisGoodResult ? (
              <LinearProgress color="secondary" />
            ) : null}
          </div>
        </CardContent>
      </Card>
        
        {postlist(posts)}
      </div>

    </Draggable>
          // <div>
      
     // </div>
  ); // return end
}
