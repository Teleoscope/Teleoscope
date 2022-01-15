import React from 'react';
import { useEffect, useState } from "react";
import Draggable from "react-draggable";

// custom components
import Notes from "../components/Notes";
import PostList from "../components/PostList";
import SearchBar from "../components/SearchBar";
import StoryCard from "../components/StoryCard";
import DocSetLabel from "../components/DocSetLabel";


//material ui
import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Divider from '@material-ui/core/Divider';
import TextField from '@material-ui/core/TextField';
import Autocomplete from '@material-ui/lab/Autocomplete';

// icons
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import FolderIcon from '@material-ui/icons/Folder';
import CancelIcon from '@material-ui/icons/Cancel';
import LaunchIcon from '@material-ui/icons/Launch';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';

import { useSelector, useDispatch } from 'react-redux'
import {fav} from "../actions/fav"


const useStyles = makeStyles((theme) => ({
  root: {
    minWidth: 275,
    maxWidth: 375,

  },
  header: {
    backgroundColor:"#9999ff",
  },
  barroot: {
    backgroundColor:"#dddddd",
    paddingLeft:2,
    paddingTop:2,
    paddingRight:2,
  },
  itemAlign: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  dividerFullWidth: {
    // marginTop: theme.spacing(2),
    // margin: `5px 0 0 ${theme.spacing(2)}px`,
  },
  dividerInset: {
    // margin: `5px 0 0 ${theme.spacing(9)}px`,
  },
  content: {
      maxHeight: "50vh",
    overflow: "auto",
  },
  search: {
    display:"block",
  }

}));

export default function DocSet(props) {
  const classes = useStyles();
  const [hover, setHover] = useState(false);
  const [posts, setPosts] = useState([]);
  const [hides, setHides] = useState([]);
  const [docExpand, setDocExpand] = useState(false);
  const [favExpand, setFavExpand] = useState(false);
  const [hideExpand, setHideExpand] = useState(false);
  const [noteExpand, setNoteExpand] = useState(false);
  const favs = useSelector((state) => state.faver.value)

  const handleOpenPost = (id) => {
    var temp = [...posts]
    var i = temp.indexOf(id)
    if (i < 0) {
      temp.push(id)  
    }
    setPosts(temp)
  }

  const handleClosePost = (id) => {

    var temp = [...posts]
    // console.log("temp1", temp, id)
    var i = temp.indexOf(id)
    temp.splice(i, 1)
    setPosts(temp)
    setHover(false)
    // console.log("temp2", temp, i)
  }

  const handleHide = (id) => { // TODO: migrate this to an action/store design
    var temp = [...hides]

    // add to hides if not in
    // remove from hides if in
    var i = temp.indexOf(id)
    if (i > -1) {
      temp.splice(i, 1)
    } else {
      temp.push(id)
    }

    setHides(temp)
  }

  const handleChildHover = (i) => {
    setHover(i)
  }

  const handleIDs = (data) => {
    ids = data["ranked_post_ids"];
    setPosts(ids)
  }
    const genPosts = (ps) => {
      if (!ps) return;
      // console.log("ELSE");
      (
        <div>
          {ps.map((id, similarity) =>
                <StoryCard
                  key={id + "storycard"}
                  postid={id}
                  close={handleClosePost}
                  hover={handleChildHover}
                  zind={similarity}
                />
            )}
          </div>
      )
    }
  const breakOut = () => {
  }

  var ids = posts;//props.docset.ranked_post_ids
  const inArr = (arr, item) => (
    arr.indexOf(item) == -1 ? false : true
  )


  return (
    <Draggable
      grid={[20, 20]}
      bounds="parent"
      defaultPosition={{ x: 200, y: 200 }}
      disabled={hover}
    >
      <div className={classes.root}>

      <Card className={classes.root}>
        <div className={classes.barroot}>
        <Grid
          // justify="space-between" // Add it here :)
          container 
          spacing={0}
        >
          <Grid item xs={1}>
            <div className={classes.itemAlign}>
              <IconButton
                size="small"
              >
                <FolderIcon 
                    fontSize="small"
                    color="disabled"
                  />
              </IconButton>
              <Typography
                variant="caption"
                color="textSecondary"
                fontSize="small"
              >
                <span>&nbsp;</span>
              </Typography>
            </div>
          </Grid>
          <Grid item xs={9}>
            <DocSetLabel
                  label={props.docset.label}
                />
          </Grid>

          <Grid item xs={2}>
           <IconButton
            size="small"
           >
            <LaunchIcon 
                fontSize="small"
                color="disabled"
              />
          </IconButton>
          <IconButton
            size="small"
          >
            <CancelIcon 
                fontSize="small"
                color="disabled"
              />
          </IconButton>
          </Grid>

        </Grid>
        </div>
        <CardContent
          className={classes.content}
        >
          <SearchBar 
            queries={props.docset.queries}
            handleIDs={handleIDs}
          />
          <Typography
            className={classes.dividerFullWidth}
            variant="overline"
          >
            Faved documents 
              {favExpand ? 
                <IconButton size="small"
                onClick={() => setFavExpand(false)} 
                ><ExpandMoreIcon/></IconButton>:
                <IconButton size="small"
                onClick={() => setFavExpand(true)}  
                ><ExpandLessIcon/></IconButton>
              }

            <IconButton size="small" onClick={() => breakOut}><ExitToAppIcon /></IconButton>
            <Divider  />
          </Typography>
            {favExpand ? 
              <PostList 
              data={ids.filter((id) => (favs.indexOf(id[0]) > -1) )}
              handleOpenClick={handleOpenPost}
              handleCloseClick={handleClosePost}
              handleHover={handleChildHover}
              handleHide={handleHide}
              hides={hides}
              isFavList={true}
              isHideList={false}
            /> : null}

          <Typography
            className={classes.dividerFullWidth}
            variant="overline"
          >
            Staged documents 
              {docExpand ? 
                <IconButton size="small"
                onClick={() => setDocExpand(false)} 
                >
                <ExpandMoreIcon
                  
                  /></IconButton>: 
                <IconButton size="small"
                onClick={() => setDocExpand(true)}>
                <ExpandLessIcon /></IconButton>}
            
            <Divider  />
          </Typography>
            {docExpand ? 
              <PostList  
              data={ids.filter((id) => (favs.indexOf(id[0]) == -1)).filter((id) => (hides.indexOf(id[0]) == -1))}
              handleOpenClick={handleOpenPost}
              handleCloseClick={handleClosePost}
              handleHover={handleChildHover}
              handleHide={handleHide}
              hides={hides}              
              isFavList={false}
              isHideList={false}
            /> : null}
            <Typography
            className={classes.dividerFullWidth}
            variant="overline"
          >
            Hidden documents 
              {hideExpand ? 
                <IconButton size="small"
                onClick={() => setHideExpand(false)} 
                >
                <ExpandMoreIcon
                  
                  /></IconButton>: 
                <IconButton size="small"
                onClick={() => setHideExpand(true)}>
                <ExpandLessIcon /></IconButton>}
            
            <Divider  />
          </Typography>
            {hideExpand ? 
              <PostList 
              data={ids.filter((id) => (hides.indexOf(id[0]) > -1) )}
              handleOpenClick={handleOpenPost}
              handleCloseClick={handleClosePost}
              handleHover={handleChildHover}
              handleHide={handleHide}
              hides={hides}              
              isFavList={false}
              isHideList={true}
            /> : null}
            <Typography
            className={classes.dividerFullWidth}
            variant="overline"
          >
            Notes
            
              {noteExpand ? 
                <IconButton size="small" onClick={() => setNoteExpand(false)} >
                <ExpandMoreIcon/></IconButton>: 
                 <IconButton size="small" onClick={() => setNoteExpand(true)} > 
                <ExpandLessIcon/></IconButton>}
            
            <Divider  />
          </Typography>
            <Notes 
              show={noteExpand}
            />
     
        </CardContent>
        <CardActions>
        </CardActions>
      </Card>
      {genPosts(posts)}
      </div>
    </Draggable>
  );
}

