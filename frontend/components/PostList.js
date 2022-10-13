import React, { useState } from "react";

// material ui
import List from "@mui/material/List";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";

// custom components
import PostListItem from "../components/PostListItem";

export default function PostList(props) {
  const data = props.data;

  // pagination
  const [pageNumber, setPageNumber] = useState(1);
  const itemsPerPage = 10;
  var displayPagination = true;
  var pageCount = 0;
  var paginatedItems = [];

  if (data) {
    displayPagination = (data.length > itemsPerPage) && props.pagination;
    pageCount = Math.ceil(data.length / itemsPerPage);
    paginatedItems = data.slice(
      (pageNumber - 1) * itemsPerPage,
      pageNumber * itemsPerPage - 1
    );
  }

  const changePage = (event, value) => {
    setPageNumber(value);
  };
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
