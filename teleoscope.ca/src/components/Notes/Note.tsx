import { useState } from "react";
// import { Editor, EditorState, convertFromRaw, convertToRaw } from "draft-js";
// import "draft-js/dist/Draft.css";
import { EditorState } from "prosemirror-state";
import { schema } from "prosemirror-schema-basic";
import { ProseMirror } from "@nytimes/react-prosemirror";
// mui
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";

//utils
import { useAppDispatch } from "@/lib/hooks";

const defaultState = EditorState.create({ schema });
export function ProseMirrorEditor({data}) {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [state, setState] = useState(EditorState.create({ schema }));
  // useEffect(()=> {
  //   if (data) {
  //     setState(EditorState.create(data.content))
  //   }
  // },[data])

  return (
    <ProseMirror
      mount={mount}
      defaultState={defaultState}
      state={state}
      dispatchTransaction={(tr) => {
        setState((s) => s.apply(tr));
      }}
    >
      <div ref={setMount} />
    </ProseMirror>
  );
}


// const useDebounce = (callback) => {
//   const ref = useRef();

//   useEffect(() => {
//     ref.current = callback;
//   }, [callback]);

//   const debouncedCallback = useMemo(() => {
//     const func = () => {
//       ref.current?.();
//     };

//     return lodash.debounce(func, 1000);
//   }, []);

//   return debouncedCallback;
// };

// Mix the nodes from prosemirror-schema-list into the basic schema to
// // create a schema with list support.
// const mySchema = new Schema({
//   nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
//   marks: schema.spec.marks
// })

export default function Note({ data: note }) {

  // const { data: note } = useSWRF(`/api/note/${id}`)

  const dispatch = useAppDispatch()
  // const editor = React.useRef(null);
 
  // const handleLoad = (note) => {
  //   if (note) {
  //     const item = note["history"][0];
  //     if (item && Object.keys(item.content).length > 0) {
  //       return EditorState.createWithContent(convertFromRaw(item["content"]));
  //     }
  //   }
  //   return EditorState.createEmpty();
  // };

  // const [editorState, setEditorState] = React.useState(() => handleLoad(note));

  // // Handlers
  // const handleBlur = () => {
  //   const content = editorState.getCurrentContent();
  // };

  // const handleOnChange = (e) => {
  //   setEditorState(e);
  //   const content = e.getCurrentContent();
  //   debouncedRequest(content);
  // };
 
  
  // const debouncedRequest = useDebounce(() => {
  //   const content = editorState.getCurrentContent();
  //   dispatch(updateNote({note_id: id, content: convertToRaw(content)}));
  // });

  


  const focusEditor = () => {
    // editor.current.focus();
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
      <div style={{ overflow: "auto", height: "100%"}}>
        <Stack
          direction="row"
          onClick={focusEditor}
          style={{ marginLeft: "10px", width: "95%", height: "100%", cursor: "text" }}
        >
          <ProseMirrorEditor data={note}></ProseMirrorEditor>
          {/* <Editor
            ref={editor}
            editorState={editorState}
            onBlur={handleBlur}
            onChange={handleOnChange}

            placeholder={"Type here..."}
          /> */}
        </Stack>
      </div>
    </Card>
  );
}