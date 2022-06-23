// import React from 'react';
// import ReactDOM from 'react-dom';
// import {Editor, EditorState} from 'draft-js';
// import 'draft-js/dist/Draft.css';
// 
// export default function MyEditor(props) {
//   const [editorState, setEditorState] = React.useState(
//     () => EditorState.createEmpty(),
//   );
// 
//   return (
//     <div style={{margin: "10px"}}>
//     <Editor 
//       editorState={editorState} 
//       onChange={setEditorState} />
//     </div>
//   )
// }
// 


import React from "react";
import { Editor, EditorState } from "draft-js";
import "draft-js/dist/Draft.css";

export default function MyEditor() {
  const [editorState, setEditorState] = React.useState(() =>
    EditorState.createEmpty()
  );

  const editor = React.useRef(null);
  function focusEditor() {
    editor.current.focus();
  }

  return (
    <div
      style={{ margin: "10px", minHeight: "6em", cursor: "text" }}
      onClick={focusEditor}
    >
      <Editor
        ref={editor}
        editorState={editorState}
        onChange={setEditorState}
        // placeholder="Write something!"
      />
    </div>
  );
}