// NoteButton.js
import React, { useContext } from 'react';

// mui
import IconButton from "@mui/material/IconButton";
import CreateIcon from '@mui/icons-material/Create';

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
		dispatch(addWindow({ i: props.id + "%note", x: 0, y: 0, w: 3, h: 3, type: "Note" }));
		client.add_note(props.id);
	}

	return (
		<IconButton onClick={() => handleAddNote()}>
			<CreateIcon fontSize="small" />
		</IconButton>
	)
}
