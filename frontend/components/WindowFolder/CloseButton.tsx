// mui
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";

// actions
import { useDispatch } from "react-redux";
import { removeWindow } from "@/actions/windows";

export default function CloseButton({ id, sx, ...props}) {
  const dispatch = useDispatch();
  return (
    <IconButton
      sx={sx}
      {...props}
      onClick={() => dispatch(removeWindow({node: id}))}
    >
      <CloseIcon sx={sx} fontSize="inherit" />
    </IconButton>
  );
}
