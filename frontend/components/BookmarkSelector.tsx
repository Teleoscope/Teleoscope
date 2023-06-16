import React from "react";

// MUI imports
import IconButton from "@mui/material/IconButton";
import StarOutlineOutlinedIcon from "@mui/icons-material/StarOutlineOutlined";
import StarOutlinedIcon from "@mui/icons-material/StarOutlined";

// Actions
import { useSelector, useDispatch } from "react-redux";
import { mark } from "@/actions/bookmark";

export default function BookmarkSelector(props) {
  const dispatch = useDispatch();

  const bookmarked = useSelector((state) => state.bookmarker.value);
  const marked = bookmarked.includes(props.id);

  return (
    <IconButton onClick={() => dispatch(mark(props.id))}>
      {marked ? (
        <StarOutlinedIcon color="secondary" sx={{ fontSize: 15 }} />
      ) : (
        <StarOutlineOutlinedIcon sx={{ fontSize: 15 }} />
      )}
    </IconButton>
  );
}
