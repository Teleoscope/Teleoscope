// NoteButton.js
import React, { useContext } from 'react';

// mui
import IconButton from "@mui/material/IconButton";
import CommentIcon from '@mui/icons-material/Comment';

// actions
import { useAppSelector, useAppDispatch } from '@/util/hooks'
import { RootState } from '@/stores/store'
import { addWindow } from "@/actions/windows";

// contexts
import { StompContext } from '@/components/Stomp'

export default function NoteButton(props) {
	const userid = useAppSelector((state: RootState) => state.activeSessionID.userid);
	const client = useContext(StompContext);
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
