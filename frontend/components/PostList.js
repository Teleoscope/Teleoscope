import React, { useState } from "react";

// material ui
import { makeStyles, useTheme } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";

// custom components
import PostListItem from "../components/PostListItem";

// actions
import { useSelector, useDispatch } from "react-redux";

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
  let sortable = props.data;
  const classes = useStyles();
  const [show, setShow] = React.useState(true);
  const [postid, setPostID] = React.useState("");
  const container = React.useRef(null);

  const favs = useSelector((state) => state.faver.value);
  const hides = useSelector((state) => state.hider.value);

  // pagination
  const [pageNumber, setPageNumber] = useState(1);
  const itemsPerPage = 12;
  var displayPagination = false;
  var pageCount = 0;
  var paginatedItems = [];

  if (sortable) {
    displayPagination = sortable.length > itemsPerPage && props.pagination;
    pageCount = Math.ceil(sortable.length / itemsPerPage);
    paginatedItems = sortable.slice(
      (pageNumber - 1) * itemsPerPage,
      pageNumber * itemsPerPage - 1
    );
  }

  const changePage = (event, value) => {
    setPageNumber(value);
  };

  return (
    <List className={classes.idlist} dense={true}>
      {displayPagination
        ? paginatedItems.map((pair) => {
            return (
              <PostListItem id={pair[0]} key={pair[0] + "PostListItem"}>
                {" "}
              </PostListItem>
            );
          })
        : sortable.map((pair) => {
            return (
              <PostListItem id={pair[0]} key={pair[0] + "PostListItem"}>
                {" "}
              </PostListItem>
            );
          })}

      {displayPagination ? (
        <Stack style={{ marginLeft: 100 }}>
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
