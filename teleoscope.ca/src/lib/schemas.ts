
import { Notes } from '@/types/notes';
import { Groups } from '@/types/groups';
import { Search } from '@/types/search';
import randomColor from 'randomcolor';
import { Workflows } from '@/types/workflows';
import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import ObjectId from 'bson-objectid';


export const newSearch = (): Search => ({
    query: ''
});

export const newGroup = (workspace_id: string, docs = []): Groups => ({
    color: randomColor(),
    label: 'New Group',
    workspace: ensureObjectId(workspace_id),
    docs
});

export const newWorkflow = ({
    workspace_id,
    label
}: {
    workspace_id: ObjectId | string;
    label: string;
}): Workflows => ({
    last_update: new Date().toISOString(),
    logical_clock: 100,
    workspace: ensureObjectId(workspace_id),
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

export function isObjectId(value: any): value is ObjectId {
    return value instanceof ObjectId;
}

export function isValidObjectIdString(value: string): boolean {
    return /^[a-f\d]{24}$/i.test(value);
}

export function ensureObjectId(value: string | null | ObjectId): ObjectId {
    if (isObjectId(value)) {
        return value;
    }
    if (typeof value === 'string' && isValidObjectIdString(value)) {
        return new ObjectId(value);
    }
    throw new Error(
        `Invalid value. Value must be a valid ObjectId string, null, or ObjectId, received: ${value}.`
    );
}

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

export const newNote = (workspace_id: string, label = 'New note'): Notes => {
    const state = EditorState.create({ schema });
    return {
        workspace: ensureObjectId(workspace_id),
        label,
        content: state.toJSON()
    };
};
