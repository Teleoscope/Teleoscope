// WindowTopBar.js
import React from "react";

// MUI
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";

// custom
import CloseButton from "../CloseButton"

// actions
import { useDispatch } from "react-redux";
import { moveWindowToFront } from "../../actions/windows";

export default function WindowTopBar(props) {
	const dispatch = useDispatch();
	return (
		<div onClick={()=>dispatch(moveWindowToFront(props.id))} className="drag-handle" style={{ cursor: "move" }}>
			<Stack direction="row" alignItems="flex-start" justifyContent="space-between">
					<IconButton size="small"
					>{props.icon}</IconButton>
						<Typography
							variant="body1"
							component="div"
							sx={{ pt: 0.6 }}
						// className="drag-handle"
						>{props.title}
						</Typography>
				<CloseButton id={props.id} size="small" />
			</Stack>
			<Divider></Divider>
		</div>
	)
}