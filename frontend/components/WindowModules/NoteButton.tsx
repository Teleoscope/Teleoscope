// NoteButton.js
import React from 'react';

// mui
import IconButton from "@mui/material/IconButton";
import CommentIcon from '@mui/icons-material/Comment';

// actions
import { useAppSelector, useAppDispatch } from '../../hooks'
import { RootState } from '../../stores/store'
import { addWindow } from "../../actions/windows";

// contexts
import { Stomp } from '../Stomp'

export default function NoteButton(props) {
	const userid = useAppSelector((state: RootState) => state.activeSessionID.userid);
    const client = Stomp.getInstance();
    client.userId = userid;
	const dispatch = useAppDispatch();

	const handleAddNote = () => {
		client.add_note(props.id, props.type);
	}

	return (
		<IconButton onClick={() => handleAddNote()}>
			<CommentIcon fontSize="small" />
		</IconButton>
	)
}
