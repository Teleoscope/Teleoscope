import React, {useContext} from "react";
import { Editor, EditorState } from "draft-js";
import "draft-js/dist/Draft.css";

// mui
import Stack from '@mui/material/Stack';
import IconButton from "@mui/material/IconButton";
import Tooltip from '@mui/material/Tooltip';

// actions
import { useSelector, useDispatch } from "react-redux"
import { dragged, addWindow, removeWindow, loadWindows } from "../actions/windows";

// custom components
import PostTitle from "./PostTitle"

// icons
import CloseIcon from "@mui/icons-material/Close";

//utils
import useSWRAbstract from "../util/swr"
import { update_note } from "../components/Stomp.js";

// contexts
import { StompContext } from '../context/StompContext'

export default function Note(props) {
  const postid = props.id.split("%")[0]
  const { post, post_loading, post_error } = useSWRAbstract("post", `/api/posts/${postid}`);
  const dispatch = useDispatch();
  const client = useContext(StompContext)

  const handleBlur = () => {
    update_note(client, postid, editorState.getCurrentContent())
  }
  const handleClose = () => {
    update_note(client, postid, editorState.getCurrentContent())
    dispatch(removeWindow(props.id))
  }

  const [editorState, setEditorState] = React.useState(() =>
    EditorState.createEmpty()
  );

  const editor = React.useRef(null);
  const focusEditor = () => {
    editor.current.focus();
  }

  return (

    <Stack direction="column" onClick={focusEditor} style={{marginLeft: "10px", cursor: "text" }}>
      <Stack 
        direction="row-reverse" 
        justifyContent="space-between"

        >
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          <PostTitle post={post ? post : {}} size="sm" color="#AAAAAA" noWrap={true}/>  
      </Stack>
      <Editor
        ref={editor}
        editorState={editorState}
        onBlur={handleBlur}
        onChange={setEditorState}
        placeholder={post ? post["title"] : props.id}
      />
    </Stack>
  );
}