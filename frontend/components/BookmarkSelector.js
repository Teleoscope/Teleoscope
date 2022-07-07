import React, { useState } from "react";


// MUI imports
import BookmarkIcon from "@mui/icons-material/Bookmark";
import IconButton from "@mui/material/IconButton";


// Actions
import { useSelector, useDispatch } from "react-redux";
import { mark } from "../actions/bookmark";



export default function BookmarkSelector(props) {

   const dispatch = useDispatch();

   const bookmarked = useSelector((state) => state.bookmarker.value);
   const marked = bookmarked.includes(props.id);

   const postID = props.id;

   return (
      <IconButton
         onClick={() => dispatch(mark(postID))}
      >
         {marked ?
            <BookmarkIcon color="secondary" style={{ fontSize: 20 }} />
            :
            <BookmarkIcon style={{ fontSize: 20 }} />
         }
      </IconButton>
   )
}