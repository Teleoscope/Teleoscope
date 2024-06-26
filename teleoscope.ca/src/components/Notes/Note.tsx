import React, { useRef, useMemo, useEffect } from "react";
import { Editor, EditorState, convertFromRaw, convertToRaw } from "draft-js";
import "draft-js/dist/Draft.css";
import lodash from 'lodash';

// mui
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";

//utils
import { useAppDispatch } from "@/lib/hooks";
import { updateNote } from "@/actions/appState";
import { useSWRF } from "@/lib/swr";


const useDebounce = (callback) => {
  const ref = useRef();

  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  const debouncedCallback = useMemo(() => {
    const func = () => {
      ref.current?.();
    };

    return lodash.debounce(func, 1000);
  }, []);

  return debouncedCallback;
};


export default function Note(props) {
  const id = props.id.split("%")[0];
  
  const { data: note } = useSWRF(`note/${id}`, {
    onSuccess: (data, key, config) => {
        setEditorState(handleLoad(data))
    }
  });

  const dispatch = useAppDispatch()
  const editor = React.useRef(null);
 
  const handleLoad = (note) => {
    if (note) {
      const item = note["history"][0];
      if (item && Object.keys(item.content).length > 0) {
        return EditorState.createWithContent(convertFromRaw(item["content"]));
      }
    }
    return EditorState.createEmpty();
  };

  const [editorState, setEditorState] = React.useState(() => handleLoad(note));

  // Handlers
  const handleBlur = () => {
    const content = editorState.getCurrentContent();
  };

  const handleOnChange = (e) => {
    setEditorState(e);
    const content = e.getCurrentContent();
    debouncedRequest(content);
  };
 
  
  const debouncedRequest = useDebounce(() => {
    const content = editorState.getCurrentContent();
    dispatch(updateNote({note_id: id, content: convertToRaw(content)}));
  });

  


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
            onChange={handleOnChange}

            placeholder={"Type here..."}
          />
        </Stack>
      </div>
    </Card>
  );
}