import React, { useState } from "react";

// material ui
import List from "@mui/material/List";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";

// custom components
import DocumentListItem from "./DocumentListItem";

export default function DocumentList(props) {
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

  const BuildDocumentListItem = (pair) => {
    return (
      <DocumentListItem group={props.group} id={pair[0]} key={pair[0] + "DocumentListItem"} {...props}>
        {" "}
      </DocumentListItem>
    );
  }

  const changePage = (event, value) => {
    setPageNumber(value);
  };
  return (
    <List dense={true}>
      {displayPagination
        ? paginatedItems.map(pair => BuildDocumentListItem(pair))
        : data.map(pair => BuildDocumentListItem(pair))
      }

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
