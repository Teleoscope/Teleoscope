import React from "react";

// MUI imports
import IconButton from "@mui/material/IconButton";
import StarOutlineOutlinedIcon from "@mui/icons-material/StarOutlineOutlined";
import StarOutlinedIcon from "@mui/icons-material/StarOutlined";

// Actions
import { useSelector, useDispatch } from "react-redux";
import { bookmark } from "@/actions/windows";

export default function BookmarkSelector(props) {
  const dispatch = useDispatch();
  const bookmarks = useSelector((state) => state.windows.bookmarks);
  const marked = bookmarks.includes(props.id);
  const settings = useSelector((state) => state.windows.settings);

  return (
    <IconButton onClick={() => dispatch(bookmark(props.id))}>

      {marked ? (
        <StarOutlinedIcon sx={{ color: settings.color, fontSize: 15 }} />
      ) : (
        <StarOutlineOutlinedIcon sx={{ fontSize: 15 }} />
      )}
    </IconButton>
  );
}
