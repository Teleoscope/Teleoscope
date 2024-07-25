import { Notes } from "@/types/notes";
import { ObjectId } from "bson";
import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";

const schema = new Schema({
    nodes: {
        doc: { content: 'block+' },
        paragraph: { group: 'block', content: 'inline*' },
        list: { group: 'block', content: 'list_item+' },
        list_item: { content: 'paragraph+', toDOM: () => ['li', 0] },
        text: { group: 'inline' }
    },
    marks: {
        em: {
            parseDOM: [{ tag: 'em' }],
            toDOM() {
                return ['em', 0];
            }
        },
        strong: {
            parseDOM: [{ tag: 'strong' }],
            toDOM() {
                return ['strong', 0];
            }
        }
    }
});


export const newNote = (workspace_id: string, label = 'New note'): Notes => {
    const state = EditorState.create({ schema });
    return {
        workspace: new ObjectId(workspace_id),
        label,
        content: state.toJSON()
    };
};