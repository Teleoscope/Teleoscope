import React, { useState, useContext } from "react";

// mui
import { Typography, Box, IconButton } from "@mui/material";
import { StompContext } from "@/components/Stomp";
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { ContentState } from "draft-js";

export default function Snippet({text, id}) {
    const session_id = useAppSelector((state) => state.activeSessionID.value);
    const client = useContext(StompContext);
    const createSnippet = () => {
        client.snippet(id, session_id, ContentState.createWithContent(text))
    }

    return (
        <Box>
            <Typography sx={{ p: 2 }}>{text}</Typography>
            <IconButton onClick={createSnippet}><TextSnippetIcon></TextSnippetIcon></IconButton>
        </Box>
    )
}