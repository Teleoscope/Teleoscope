import React, { useState, useContext } from "react";

// mui
import { Typography, Box, IconButton } from "@mui/material";
import { StompContext } from "@/components/Stomp";
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { ContentState, convertToRaw } from "draft-js";

export default function Snippet({text, id}) {
    const session_id = useAppSelector((state) => state.activeSessionID.value);
    const client = useContext(StompContext);
    const createSnippet = () => {
        const content = convertToRaw(ContentState.createFromText(text));
        client.snippet(id, session_id, content)
    }

    return (
        <Box>
            <Typography sx={{ p: 2 }}>{text}</Typography>
            <IconButton onClick={createSnippet}><TextSnippetIcon></TextSnippetIcon></IconButton>
        </Box>
    )
}