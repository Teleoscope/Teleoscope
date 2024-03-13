// MUI imports
import IconButton from "@mui/material/IconButton";
import StarOutlineOutlinedIcon from "@mui/icons-material/StarOutlineOutlined";
import StarOutlinedIcon from "@mui/icons-material/StarOutlined";

// Actions
import { useSelector, useDispatch } from "react-redux";
import { bookmark } from "@/actions/windows";

export default function BookmarkSelector({ id }) {
  const dispatch = useDispatch();
  const bookmarks = useSelector((state) => state.windows.bookmarks);
  const marked = bookmarks.includes(id);
  const settings = useSelector((state) => state.windows.settings);

  return (
    <IconButton onClick={() => dispatch(bookmark(id))}>

      {marked ? (
        <StarOutlinedIcon sx={{ color: settings.color, fontSize: 15 }} />
      ) : (
        <StarOutlineOutlinedIcon sx={{ fontSize: 15 }} />
      )}
    </IconButton>
  );
}
