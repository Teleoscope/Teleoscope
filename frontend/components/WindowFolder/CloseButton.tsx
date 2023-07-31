// mui
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";

// actions
import { useDispatch } from "react-redux";
import { removeWindow } from "@/actions/windows";
import { useStomp } from "@/util/Stomp";

export default function CloseButton(props) {
  const dispatch = useDispatch();
  const client = useStomp();
  return (
    <IconButton
      sx={props.sx}
      {...props}
      onClick={() => dispatch(removeWindow({client: client, node: props.id}))}
    >
      <CloseIcon sx={props.sx} fontSize="inherit" />
    </IconButton>
  );
}
