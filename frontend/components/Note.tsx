import { useRef, useEffect, useState } from "react";
import { Editor, EditorState, convertFromRaw, convertToRaw } from "draft-js";
import "draft-js/dist/Draft.css";

// mui
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";

//utils
import { useSWRHook } from "@/util/swr";

// contexts
import { useStomp } from "@/util/Stomp";

export default function Note(props) {
  const id = props.id.split("%")[0];
    const swr = useSWRHook();
    const { data: noteData, error } = swr.useSWRAbstract("note", `note/${id}`);

    const client = useStomp();
    const editor = useRef(null);

    const [isLoaded, setIsLoaded] = useState(false);
    const [editorState, setEditorState] = useState(() => EditorState.createEmpty());

    const handleLoad = (note) => {
        if (note) {
            const item = note["history"][0];
            if (item && Object.keys(item.content).length > 0) {
                return EditorState.createWithContent(convertFromRaw(item["content"]));
            }
        }
        return EditorState.createEmpty();
    };

    // Initialize the editor state only once when the component mounts or `id` changes
    useEffect(() => {
        if (noteData && !isLoaded) {
            setEditorState(handleLoad(noteData));
            setIsLoaded(true);  // Mark as loaded
        }
    }, [noteData, isLoaded]);


    // Handlers
    const handleBlur = () => {
        const content = editorState.getCurrentContent();
        client.update_note(id, convertToRaw(content));
    };

    const handleFocus = () => {
        const content = editorState.getCurrentContent();
    };

    const handleOnChange = (e) => {
        setEditorState(e);
    };

    const focusEditor = () => {
        editor.current.focus();
    };

  return (
    <Card
      variant="outlined"
      style={{
        backgroundColor: "white",
        height: "100%",
        // marginBottom:"-1em"
      }}
      sx={{
        boxShadow: "0",
      }}
    >
      <div style={{ overflow: "auto", height: "100%" }}>
        <Stack
          direction="column"
          onClick={focusEditor}
          style={{ marginLeft: "10px", cursor: "text" }}
        >
          <Editor
            ref={editor}
            editorState={editorState}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onChange={handleOnChange}

            placeholder={"Type here..."}
          />
        </Stack>
      </div>
    </Card>
  );
}
