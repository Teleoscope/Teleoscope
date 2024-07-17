// mui
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";

// actions
import { useDispatch } from "react-redux";
import { updateNodes } from "@/actions/appState";

export default function CloseButton({ id, sx, ...props}) {
  const dispatch = useDispatch();
  return (
    <IconButton
      sx={sx}
      {...props}
      onClick={() => dispatch(updateNodes({
        changes: [
          {
            id: id,
            type: "remove"
          }
        ]
      }))}
    >
      <CloseIcon sx={sx} fontSize="inherit" />
    </IconButton>
  );
}
