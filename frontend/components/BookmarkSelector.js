import React, { useState } from "react";


// MUI imports
import StarOutline from "@mui/icons-material/Bookmark";
import IconButton from "@mui/material/IconButton";
import StarOutlineOutlinedIcon from '@mui/icons-material/StarOutlineOutlined';
import StarOutlinedIcon from '@mui/icons-material/StarOutlined';

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
            <StarOutlinedIcon color="secondary" style={{ fontSize: 15 }} />
            :
            <StarOutlineOutlinedIcon style={{ fontSize: 15 }} />
         }
      </IconButton>
   )
}