// NoteButton.js
import React, { useContext } from 'react';

// mui
import IconButton from "@mui/material/IconButton";
import CreateIcon from '@mui/icons-material/Create';

// actions
import { useDispatch } from "react-redux";
import { addWindow } from "../actions/windows";

// contexts
import { StompContext } from '../context/StompContext'


// utils
import { add_note } from "../components/Stomp.ts";

export default function NoteButton(props) {
	const client = useContext(StompContext)
	const dispatch = useDispatch();

	const handleAddNote = () => {
		dispatch(addWindow({ i: props.id + "%note", x: 0, y: 0, w: 3, h: 3, type: "Note" }));
		add_note(client, props.id);
	}

	return (
		<IconButton onClick={() => handleAddNote()}>
			<CreateIcon fontSize="small" />
		</IconButton>
	)
}
