
import { Notes } from '@/types/notes';
import { Groups } from '@/types/groups';
import { Search } from '@/types/search';
import randomColor from 'randomcolor';
import { Workflows } from '@/types/workflows';
import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';


export const newSearch = (): Search => ({
    query: ''
});

export const newGroup = (workspace_id, docs = []): Groups => ({
    color: randomColor(),
    label: 'New Group',
    workspace: workspace_id,
    docs
});

export const newWorkflow = ({
    workspace_id,
    label
}): Workflows => ({
    last_update: new Date().toISOString(),
    logical_clock: 100,
    workspace: workspace_id,
    label,
    nodes: [],
    edges: [],
    bookmarks: [],
    selection: {
        nodes: [],
        edges: []
    },
    settings: {
        color: randomColor(),
        title_length: 100
    }
});


export const schema = new Schema({
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

export const newNote = (workspace_id, label = 'New note'): Notes => {
    const state = EditorState.create({ schema });
    return {
        workspace: workspace_id,
        label,
        content: state.toJSON()
    };
};
