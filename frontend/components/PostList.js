import React, { useState } from "react";

// material ui


import List from "@mui/material/List";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";

// custom components
import PostListItem from "../components/PostListItem";

// actions
import { useSelector, useDispatch } from "react-redux";
/*
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
*/
export default function PostList(props) {
  const data = props.data;

  // pagination
  const [pageNumber, setPageNumber] = useState(1);
  const itemsPerPage = 12;
  var displayPagination = false;
  var pageCount = 0;
  var paginatedItems = [];

  if (data) {
    displayPagination = data.length > itemsPerPage && props.pagination;
    pageCount = Math.ceil(data.length / itemsPerPage);
    paginatedItems = data.slice(
      (pageNumber - 1) * itemsPerPage,
      pageNumber * itemsPerPage - 1
    );
  }

  const changePage = (event, value) => {
    setPageNumber(value);
  };
  // className={classes.idlist} in List
  return (
    <List dense={true}>
      {displayPagination
        ? paginatedItems.map((pair) => {
            return (
              <PostListItem id={pair[0]} key={pair[0] + "PostListItem"}>
                {" "}
              </PostListItem>
            );
          })
        : data.map((pair) => {
            return (
              <PostListItem id={pair[0]} key={pair[0] + "PostListItem"}>
                {" "}
              </PostListItem>
            );
          })}

      {displayPagination ? (
        <Stack style={{ paddingTop: 30 }}>
          <Pagination
            count={pageCount}
            onChange={changePage}
            page={pageNumber}
            style={{ marginTop: 20, margin: "auto" }}
          />
        </Stack>
      ) : null}
    </List>
  );
}
