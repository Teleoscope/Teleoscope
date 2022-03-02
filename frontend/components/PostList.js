import React from "react";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import clsx from "clsx";

// material ui
import { makeStyles, useTheme } from "@material-ui/core/styles";
import Input from "@material-ui/core/Input";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import ListItemText from "@material-ui/core/ListItemText";
import Select from "@material-ui/core/Select";
import Checkbox from "@material-ui/core/Checkbox";
import Chip from "@material-ui/core/Chip";
import Button from "@material-ui/core/Button";
import Portal from "@material-ui/core/Portal";
import List from "@material-ui/core/List";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";

// icons
import IconButton from "@material-ui/core/IconButton";
import DeleteIcon from "@material-ui/icons/Delete";
import ArrowDownwardIcon from "@material-ui/icons/ArrowDownward";

// custom components
import PostListItem from "../components/PostListItem";

// actions
import { useSelector, useDispatch } from "react-redux";
import { fav } from "../actions/fav";
import { hide } from "../actions/hide";
import { display } from "@mui/system";

const useStyles = makeStyles((theme) => ({
  margin: {
    margin: theme.spacing(1),
  },
  extendedIcon: {
    marginRight: theme.spacing(1),
  },
  idlist: {
    // overflow: "auto",
    // maxHeight: "200px",
  },
  floater: {
    position: "absolute",
    top: "10px",
  },
}));

export default function PostList(props) {
  var sortable = props.data;
  const classes = useStyles();
  const [show, setShow] = React.useState(true);
  const [postid, setPostID] = React.useState("");
  const container = React.useRef(null);

  const favs = useSelector((state) => state.faver.value);
  const hides = useSelector((state) => state.hider.value);

  const handleOpenClick = (id) => {
    console.log(id);
  };

  const handleCloseClick = (id) => {
    console.log(id);
  };

  const handleHover = (h) => {
    console.log(h); // boolean
  };

  // pagination
  const [pageNumber, setPageNumber] = useState(1);
  const itemsPerPage = 12;
  var displayPagination = false;
  var pageCount = 0;

  if (sortable) {
    displayPagination = sortable.length > itemsPerPage && props.pagination;
    pageCount = Math.ceil(sortable.length / itemsPerPage);
  }

  const paginatedItems = sortable.slice(
    (pageNumber - 1) * itemsPerPage,
    pageNumber * itemsPerPage - 1
  );

  const changePage = (event, value) => {
    setPageNumber(value);
  };

  return (
    <List className={classes.idlist} dense={true}>
      {displayPagination
        ? paginatedItems.map((pair) => {
            let id = pair[0];
            var i_fav = favs.indexOf(id);
            var i_hide = hides.indexOf(id);
            var in_favs = i_fav > -1;
            var in_hides = i_hide > -1;
            return (
              <PostListItem
                id={id}
                key={id + "PostListItem"}
                hover={handleHover}
                handleOpenClick={props.handleOpenClick}
                handleCloseClick={props.handleCloseClick}
                fav={in_favs}
                workspace={false}
                addItemToWorkSpace={props.addItemToWorkSpace}
              ></PostListItem>
            );
          })
        : sortable.map((pair) => {
            let id = pair[0];
            var i_fav = favs.indexOf(id);
            var i_hide = hides.indexOf(id);
            var in_favs = i_fav > -1;
            var in_hides = i_hide > -1;
            return (
              <PostListItem
                id={id}
                key={id + "PostListItem"}
                hover={handleHover}
                handleOpenClick={props.handleOpenClick}
                handleCloseClick={props.handleCloseClick}
                fav={in_favs}
                workspace={false}
                addItemToWorkSpace={props.addItemToWorkSpace}
              ></PostListItem>
            );
          })}
      {displayPagination ? (
        <Stack spacing={2}>
          <Pagination
            count={pageCount}
            onChange={changePage}
            page={pageNumber}
            style={{ marginTop: 20 }}
          />
        </Stack>
      ) : null}
    </List>
  );
}
