// MUI imports
import IconButton from "@mui/material/IconButton";
import StarOutlineOutlinedIcon from "@mui/icons-material/StarOutlineOutlined";
import StarOutlinedIcon from "@mui/icons-material/StarOutlined";

// Actions
import { bookmark } from "@/actions/appState";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

export default function BookmarkSelector({ id }) {
  const dispatch = useAppDispatch();
  const bookmarks = useAppSelector((state) => state.appState.workflow.bookmarks);
  const marked = bookmarks.includes(id);
  const settings = useAppSelector((state) => state.appState.workflow.settings);

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
