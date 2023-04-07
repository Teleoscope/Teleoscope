// WindowTopBar.js
import React, { useContext } from "react";

// MUI
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";

// custom
import CloseButton from "../CloseButton"

// actions
import { useDispatch } from "react-redux";
import { minimizeWindow } from "@/actions/windows";

export default function WindowTopBar(props) {
	const dispatch = useDispatch();
	return (
			<Stack  sx={{ cursor: "move" }} direction="row" alignItems="flex-start" justifyContent="space-between">
				<IconButton size="small"
					onClick={() => dispatch(minimizeWindow({id: props.id}))}
					>{props.icon}
				</IconButton>
					<Typography variant="body1" component="div" sx={{ pt: 0.6 }}>
						{props.title}
					</Typography>
				<CloseButton id={props.id} size="small" />
			</Stack>

	)
}