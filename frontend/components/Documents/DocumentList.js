import React, { useState } from "react";

// material ui
import LoadingButton from "@mui/lab/LoadingButton";

// custom components
import DocumentListItem from "./DocumentListItem";
import ItemList from "../ItemList";
import { setSelection } from "@/actions/windows";
import { useAppSelector, useAppDispatch } from "@/util/hooks";

export default function DocumentList(props) {
  const data = props.data;
  const dispatch = useAppDispatch();

  // pagination
  const [pageNumber, setPageNumber] = useState(1);
  const itemsPerPage = 10;
  var displayPagination = true;
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

  const renderItem = (index, item, currentIndex, setIndex) => {
    return (
      <DocumentListItem
        setIndex={setIndex}
        listIndex={index}
        group={props.group}
        highlight={index == currentIndex}
        id={item[0]}
        key={item[0] + "DocumentListItem"}
        {...props}
      />
    );
  };

  const changePage = (event, value) => {
    setPageNumber(value);
  };

  if (props.loading) {
    return <LoadingButton></LoadingButton>;
  }

  const onSelect = (doc) => {
    if (doc) {
      dispatch(
        setSelection({
          nodes: [{ id: doc[0], data: { type: "Document" } }],
          edges: [],
        })
      );
    }
  };


  return (
    <ItemList data={data} render={renderItem} onSelect={onSelect}></ItemList>
  );
}
