import React from 'react';
import ReactDOM from 'react-dom';
import {Editor, EditorState} from 'draft-js';
import 'draft-js/dist/Draft.css';

export default function MyEditor(props) {
  const [editorState, setEditorState] = React.useState(
    () => EditorState.createEmpty(),
  );

  return (
    <div style={{margin: "10px"}}>
    <Editor 
      editorState={editorState} 
      onChange={setEditorState} />
    </div>
  )
}
