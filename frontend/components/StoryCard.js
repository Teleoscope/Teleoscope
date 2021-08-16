import React from "react";
import useSWR, { mutate } from "swr";
import { makeStyles } from "@material-ui/core/styles";
import clsx from "clsx";
import Draggable from "react-draggable";

// custom compomnents
import Notes from "../components/Notes";
import TextReader from "../components/TextReader";

// material ui
import { spacing } from "@material-ui/system";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardMedia from "@material-ui/core/CardMedia";
import CardContent from "@material-ui/core/CardContent";
import CardActions from "@material-ui/core/CardActions";
import CardActionArea from "@material-ui/core/CardActionArea";
import Collapse from "@material-ui/core/Collapse";
import Avatar from "@material-ui/core/Avatar";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import { red } from "@material-ui/core/colors";

// icons
import CancelIcon from "@material-ui/icons/Cancel";
import ViewCompactIcon from "@material-ui/icons/ViewCompact";
import FavoriteIcon from "@material-ui/icons/Favorite";
import ShareIcon from "@material-ui/icons/Share";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import MoreVertIcon from "@material-ui/icons/MoreVert";


const fetcher = (...args) => fetch(...args).then((res) => res.json());
function usePost(postid) {
  const { data, error } = useSWR(
    `http://localhost:3000/api/posts/${postid}`,
    fetcher
  );
  return {
    post: data,
    loading: !error && !data,
    error: error,
  };
}

export default function StoryCard(props) {
  const useStyles = makeStyles((theme) => ({
    root: {
      width: 445,
      maxHeight: 300,
      overflow: "auto",
    },
    root_compact: {
      maxWidth: 245,
      maxHeight: 200,
      overflow: "hidden",
    },
    media: {
      height: 0,
      paddingTop: "56.25%", // 16:9
    },
    expand: {
      transform: "rotate(0deg)",
      marginLeft: "auto",
      transition: theme.transitions.create("transform", {
        duration: theme.transitions.duration.shortest,
      }),
    },
    compact: {
      transform: "rotate(270deg)",
    },
    expandOpen: {
      transform: "rotate(180deg)",
    },
    avatar: {
      backgroundColor: red[500],
    },
  }));

  const classes = useStyles();
  const [expanded, setExpanded] = React.useState(false);
  const [compact, setCompact] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const { post, loading, error } = usePost(props.postid);

  const handleExpandClick = () => {
    compact ? setCompact(false) : setExpanded(!expanded);
  };

  const handleCompactClick = () => {
    setCompact(!compact);
  };


  const postTitle = (post) => {
      String.prototype.trimLeft = function(charlist) {
      if (charlist === undefined)
      charlist = "\s";
      return this.replace(new RegExp("^[" + charlist + "]+"), "");
    };
    var regex = new RegExp("(AITA for|aita for|AITA if|WIBTA if|AITA|aita|WIBTA)")
    var title = post["title"].replace(regex, "")
    var charlist = " -"
    title = title.trimLeft(charlist)
    var first = title.slice(0,1)
    var ret = first.toUpperCase() + title.slice(1)
    return ret
  }

  if (!compact) {
    return (
      <Draggable 
        grid={[20, 20]}
        defaultPosition={{ x: -100, y: -100 }}
        disabled={hover}

      >
        <Card 
          className={classes.root}
          onMouseEnter={() => {
              props.hover(true);
            }}
          onMouseLeave={() => {
              props.hover(false);
            }}
        >
          <CardHeader
            avatar={
              <IconButton
                aria-label="add to favorites"
                onClick={() => props.handleFav(props.postid)}
              >
                {props.fav ? <FavoriteIcon color="secondary" /> : <FavoriteIcon />}
              </IconButton>
            }
            action={
              <CardActions disableSpacing>
                <div className={classes.compactor}></div>
                <IconButton onClick={handleCompactClick}>
                  <ViewCompactIcon style={{ fontSize: 20 }} />
                </IconButton>
                <IconButton
                  className={clsx(classes.expand, {
                    [classes.expandOpen]: expanded,
                  })}
                  onClick={handleExpandClick}
                  aria-expanded={expanded}
                  aria-label="show more"
                >
                  <ExpandMoreIcon style={{ fontSize: 20 }} />
                </IconButton>
                <IconButton onClick={() => props.close(props.postid)}>
                  <CancelIcon style={{ fontSize: 20 }} />
                </IconButton>
              </CardActions>
            }
            title={post ? post["title"] : "Post loading..."}
            subheader={post ? post["author"] : "Post loading..."}
          />

          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <CardContent
              onMouseEnter={()=> setHover(true)}
              onMouseLeave={()=> setHover(false)}
            >
              
                {post ? <TextReader text={post["selftext"]} /> : "Post loading..."}
              

              <Notes
                show={true}

              />
            </CardContent>
          </Collapse>
        </Card>
      </Draggable>
    );
  }
  return (
    <Draggable grid={[20, 20]}>
      <Card 
      className={classes.root_compact}
                onMouseEnter={() => {
              props.hover(true);
            }}
          onMouseLeave={() => {
              props.hover(false);
            }}
      >
        <CardActions disableSpacing>
          <IconButton aria-label="add to favorites" onClick={() => props.handleFav(props.postid)}>
            {props.fav ? (
              <FavoriteIcon color="secondary" style={{ fontSize: 10 }} />
            ) : (
              <FavoriteIcon style={{ fontSize: 10 }} />
            )}
          </IconButton>
          <Typography variant="caption" display="block" gutterBottom>
            {post ? postTitle(post) : "Post loading..."}
          </Typography>
          <IconButton
            className={clsx(classes.expand, {
              [classes.expandOpen]: expanded,
            })}
            onClick={handleExpandClick}
            aria-expanded={expanded}
            aria-label="show more"
          >
            <ExpandMoreIcon style={{ fontSize: 10 }} />
          </IconButton>
          <IconButton onClick={() => props.close(props.postid)}>
            <CancelIcon style={{ fontSize: 10 }} />
          </IconButton>
        </CardActions>
      </Card>
    </Draggable>
  );
}
