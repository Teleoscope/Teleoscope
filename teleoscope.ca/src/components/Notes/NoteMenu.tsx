import { toggleMark } from "prosemirror-commands";
import { useContext } from "react";
import ProseMirrorContext from "@/context/ProseMirrorContext";
import type { MarkType } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import type { ReactNode } from "react";

function isMarkActive(mark: MarkType, state: EditorState): boolean {
  const { from, $from, to, empty } = state.selection;
  return empty
    ? !!mark.isInSet(state.storedMarks || $from.marks())
    : state.doc.rangeHasMark(from, to, mark);
}

export function Button(props: {
  className?: string;
  children?: ReactNode;
  isActive: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={props.title}
      aria-pressed={props.isActive}
      className={`button ${props.className}`}
      onClick={props.onClick}
    >
      <span className="sr-only">{props.title}</span>
      <span aria-hidden>{props.children}</span>
    </button>
  );
}

export default function NoteMenu() {
  const context = useContext(ProseMirrorContext);

  if (!context) {
    return null; // Or handle the error appropriately
  }

  const { editorState, dispatch } = context;

  const toggleBold = () => {
    const toggleBoldMark = toggleMark(editorState.schema.marks["strong"]);
    toggleBoldMark(editorState, dispatch);
  };

  const toggleItalic = () => {
    const toggleItalicMark = toggleMark(editorState.schema.marks["em"]);
    toggleItalicMark(editorState, dispatch);
  };

  return (
    <div className="flex space-x-2 mb-2">
      <Button
        className=""
        isActive={isMarkActive(editorState.schema.marks["strong"], editorState)}
        onClick={toggleBold}
        title="Bold"
      >
        <strong>B</strong>
      </Button>
      <Button
        className=""
        isActive={isMarkActive(editorState.schema.marks["em"], editorState)}
        onClick={toggleItalic}
        title="Italic"
      >
        <em>I</em>
      </Button>
    </div>
  );
}
