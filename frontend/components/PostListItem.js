import React from "react";
import useSWR, { mutate } from "swr";
import clsx from "clsx";
import Draggable from "react-draggable";

// material ui
import { makeStyles } from "@material-ui/core/styles";
import { spacing } from "@material-ui/system";
import Collapse from "@material-ui/core/Collapse";
import Avatar from "@material-ui/core/Avatar";
import Typography from "@material-ui/core/Typography";
import { red } from "@material-ui/core/colors";
import ListItem from '@material-ui/core/ListItem';
import Grid from '@material-ui/core/Grid';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';

// icons
import IconButton from "@material-ui/core/IconButton";
import FavoriteIcon from "@material-ui/icons/Favorite";
import ShareIcon from "@material-ui/icons/Share";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import ViewCompactIcon from "@material-ui/icons/ViewCompact";
import CancelIcon from "@material-ui/icons/Cancel";
import DeleteIcon from '@material-ui/icons/Delete';
import VisibilityOffIcon from '@material-ui/icons/VisibilityOff';

// actions
import { useSelector, useDispatch } from 'react-redux'
import {fav} from "../actions/fav"
import {hide} from "../actions/hide"

const useStyles = makeStyles((theme) => ({
  margin: {
    margin: theme.spacing(1),
    padding: 5,
  },
  extendedIcon: {
    marginRight: theme.spacing(1),
  },
  idlist: {
    // overflow: "scroll",
    // maxHeight: "200px",
  },
  floater: {
    position: "absolute",
    top: "10px",
  },
  root: {
    // margin: 5,
      maxWidth: 290,
      // maxHeight: 200,
      // overflow: "hidden",
    },
  title: {
    // border: "1px solid #ffffff",
    // borderRadius:5,
    // "&:hover" :{
    //   border: "1px solid #eeeeee",
      // backgroundColor: "red",
      
    // },

  },
    itemAlign: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

}));

const fetcher = (...args) => fetch(...args).then((res) => res.json());
function usePost(postid) {
  const { data, error } = useSWR(
    `/api/posts/${postid}`,
    fetcher
  );
  return {
    post: data,
    loading: !error && !data,
    error: error,
  };
}

export default function QueryListItem(props) {
  const classes = useStyles();
  const { post, loading, error } = usePost(props.id);
  const container = React.useRef(null);
  const dispatch = useDispatch()
  const favs = useSelector((state) => state.faver.value)
  const faved = favs.includes(props.id)

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

  return (
      <ListItem 
        button
        className={classes.root}
        onMouseEnter={() => props.hover(true)}
        onMouseLeave={() => props.hover(false)}
        disableGutters={true}
      >
        <ListItemIcon>
            <IconButton 
              aria-label="add to favorites"
              onClick={() => dispatch(fav(props.id))}
            >
              {faved ? (
                <FavoriteIcon 
                  color="secondary" 
                  style={{ fontSize: 20 }} 
                />
              ) : (
                <FavoriteIcon 
                  style={{ fontSize: 20 }}
                />
              )}
            </IconButton>
          </ListItemIcon>
          <ListItemText
            onClick={() => props.handleOpenClick(props.id)}
          >
            {post ? postTitle(post) : "Post loading..."}
          </ListItemText>
          <ListItemIcon>
            <IconButton 
              onClick={() => dispatch(hide(props.id))}
            >
              <VisibilityOffIcon style={{ fontSize: 20 }} />
            </IconButton>
          </ListItemIcon>  
      </ListItem>
  );
}

