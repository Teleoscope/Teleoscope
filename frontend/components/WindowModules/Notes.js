import React, { useContext } from "react";
import { Editor, EditorState, convertFromRaw, convertToRaw } from "draft-js";
import "draft-js/dist/Draft.css";

// mui
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import IconButton from "@mui/material/IconButton";
import Tooltip from '@mui/material/Tooltip';

// actions
import { useDispatch } from "react-redux"
import { removeWindow } from "../actions/windows";

// custom components
import PostTitle from "../PostTitle"
import { WindowHeader } from "../Window/WindowHeader";
import { WindowBody } from "../Window/WindowBody";


// icons
import CloseIcon from "@mui/icons-material/Close";

//utils
import useSWRAbstract from "../util/swr"
import { update_note } from "../components/Stomp.ts";

// contexts
import { StompContext } from '../../context/StompContext'

// abstracting Header and Body

const NoteHeader = ({ props }) => {
  return (
    <div>

    </div>
  )
}



const NoteBody = ({ props }, editor, postid) => {
  const { note, note_loading, note_error } = useSWRAbstract("note", `/api/notes/${postid}`);

  // Handlers
  const handleBlur = () => {
    var content = editorState.getCurrentContent();
    update_note(client, postid, convertToRaw(content))
  }

  const handleFocus = () => {
  }

export default function Note(props) {
  const postid = props.id.split("%")[0]
  const { post, post_loading, post_error } = useSWRAbstract("post", `/api/posts/${postid}`);
  const { note, note_loading, note_error } = useSWRAbstract("note", `/api/notes/${postid}`);
  const dispatch = useDispatch();
  const client = useContext(StompContext)
  const editor = React.useRef(null);

  const handleLoad = () => {
    if (note) {
      console.log("editor", note)
      var item = note["history"][note["history"].length - 1];
      if (item) {
        console.log("editor", item)
        return EditorState.createWithContent(convertFromRaw(item["content"]));
      }
    }
    return EditorState.createEmpty()
  }

  const [editorState, setEditorState] = React.useState(() => handleLoad());

  return (
    <div>
      <Editor
        ref={editor}
        editorState={editorState}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onChange={setEditorState}
      // placeholder={post ? post["title"] : props.id}
      />
    </div>
  )
}

export default function Note(props) {
  const editor = React.useRef(null);
  const postid = props.id.split("%")[0]
  const { post, post_loading, post_error } = useSWRAbstract("post", `/api/posts/${postid}`);
  const dispatch = useDispatch();
  const client = useContext(StompContext)
  // const editor = React.useRef(null);

  const handleFocus = () => {

  }

  const handleClose = () => {
    update_note(client, postid, convertToRaw(editorState.getCurrentContent()))
    dispatch(removeWindow(props.id))
  }

  const focusEditor = () => {
    editor.current.focus();
  }

  return (
    // <div>
    //   <Stack direction="column" onClick={focusEditor} style={{ marginLeft: "10px", cursor: "text" }}>
    //     <Stack
    //       direction="row-reverse"
    //       justifyContent="space-between"
    //     >
    //       <IconButton size="small" onClick={handleClose}>
    //         <CloseIcon fontSize="small" />
    //       </IconButton>
    //       <PostTitle post={post ? post : {}} size="sm" color="#AAAAAA" noWrap={true} />
    //     </Stack>
    //     <WindowBody>
    //       <NoteBody props={props} editor={editor} postid={postid}/>
    //     </WindowBody>
    <Card
      variant="outlined"
      style={{
        backgroundColor: "white",
        height: "100%",
        // marginBottom:"-1em"
      }}
      sx={{
        boxShadow: '0',
      }}
    >
      <div style={{ overflow: "auto", height: "100%" }}>
        <Stack direction="column" onClick={focusEditor} style={{ marginLeft: "10px", cursor: "text" }}>
          <Stack
            direction="row-reverse"
            justifyContent="space-between"
            className="drag-handle"
          >
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
            <PostTitle title={post ? post.title : ""} size="sm" color="#AAAAAA" noWrap={true} />
          </Stack>
          <Editor
            ref={editor}
            editorState={editorState}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onChange={setEditorState}
          // placeholder={post ? post["title"] : props.id}
          />
        </Stack>
      </div>
    </Card>
  );
}