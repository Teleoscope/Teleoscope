import { createContext, Dispatch } from "react";
import { EditorState } from "prosemirror-state";
import { Transaction } from "prosemirror-state";

interface ProseMirrorContextProps {
  editorState: EditorState;
  dispatch: Dispatch<Transaction>;
}

const ProseMirrorContext = createContext<ProseMirrorContextProps | undefined>(undefined);

export default ProseMirrorContext;
