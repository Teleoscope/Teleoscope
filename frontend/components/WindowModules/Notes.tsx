import React from "react";
import { Editor, EditorState, convertFromRaw, convertToRaw } from "draft-js";
import "draft-js/dist/Draft.css";

// mui
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';

// actions
import { useAppSelector } from '../../hooks'
import { RootState } from '../../stores/store'

//utils
import useSWRAbstract from "../../util/swr"

// contexts
import { Stomp } from '../Stomp'

export default function Note(props) {
  const { note } = useSWRAbstract("note", `/api/note/${props._id}`);
  const userid = useAppSelector((state: RootState) => state.activeSessionID.userid); //value was userid
  const client = Stomp.getInstance();
  client.userId = userid;
  const editor = React.useRef(null);


  const handleLoad = () => {
    if (note) {
      const item = note["history"][0];
      if (item) {
        return EditorState.createWithContent(convertFromRaw(item["content"]));
      }
    }
    return EditorState.createEmpty()
  }

  const [editorState, setEditorState] = React.useState(() => handleLoad());

  // Handlers
  const handleBlur = () => {
    const content = editorState.getCurrentContent();
    client.update_note(props._id, convertToRaw(content))
  }

  const handleOnChange = (e) => {
    setEditorState(e);
    const content = editorState.getCurrentContent();
    client.update_note(props._id, convertToRaw(content))
  }


  const handleFocus = () => {
    console.log("focused on Note")
  }

  const focusEditor = () => {
    editor.current.focus();
  }

  return (
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
          <Editor
            ref={editor}
            editorState={editorState}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onChange={handleOnChange}
          // placeholder={document ? document["title"] : props.id}
          />
        </Stack>
      </div>
    </Card>
  );
}