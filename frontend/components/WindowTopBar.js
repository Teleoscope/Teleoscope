// WindowTopBar.js
import React, { useState } from "react";

// MUI
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";

// custom
import CloseButton from "../components/CloseButton"

// actions
import { useSelector, useDispatch } from "react-redux";
import { minimizeWindow, maximizeWindow, checkWindow, moveWindowToFront } from "../actions/windows";


export default function WindowTopBar(props) {
	const dispatch = useDispatch();
	return (
		<div className="drag-handle" style={{ cursor: "move" }}>
			<Stack direction="row" alignItems="center" justifyContent="space-between">
				<Stack direction="row" alignItems="center">
					<IconButton size="small"
						onClick={() => {
							props.handleShow();
							dispatch(moveWindowToFront(props.id))
						}}
					>{props.icon}</IconButton>
					<Tooltip title={props.title}>
						<Typography
							variant="subtitle"
							gutterBottom
							component="div"
							noWrap
							sx={{ pt: 0.6 }}
						// className="drag-handle"
						>{props.title}
						</Typography>
					</Tooltip>
				</Stack>
				<CloseButton id={props.id} size="small" />
			</Stack>
			<Divider></Divider>
		</div>
	)
}