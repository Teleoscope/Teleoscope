import { EditorState } from 'prosemirror-state';
import { Schema } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { Db, InsertOneResult, MongoClient, ObjectId } from 'mongodb';
import { Notes } from '@/types/notes';
import { Graph } from '@/types/graph';
import { Groups } from '@/types/groups';
import { Search } from '@/types/search';
import { dbOp } from './db';
import randomColor from 'randomcolor';

export const newNote = (workspace_id: string, label="New note") => {
    const mySchema = new Schema({
        nodes: addListNodes(
            schema.spec.nodes,
            'paragraph block*',
            'block'
        ),
        marks: schema.spec.marks
    });
    let state = EditorState.create({ schema: mySchema });
    const note: Notes = {
        workspace: ensureObjectId(workspace_id),
        label: label,
        content: state.toJSON()
    };
    return note
}


export const newSearch = () => {
    const search: Search = {
        query: ''
    };
    return search
}

export const newGroup = (workspace_id: string, docs=[]) => {
    const group: Groups = {
        color: randomColor(),
        label: 'New Group',
        workspace: ensureObjectId(workspace_id),
        docs: docs
    };
    return group
}

export async function insert(
    coll: string,
    obj: Search | Groups | Notes | Graph
): Promise<InsertOneResult> {
    return await dbOp(
        async (client: MongoClient, db: Db): Promise<InsertOneResult> => {
            const insert_result = await db
                .collection<typeof obj>(coll)
                .insertOne(obj);
            return insert_result;
        }
    );
}
// Type guard to check if the value is an ObjectId
export function isObjectId(value: any): value is ObjectId {
    return value instanceof ObjectId;
}

// Validate if a string can be a valid ObjectId
export function isValidObjectIdString(value: string): boolean {
    return /^[a-f\d]{24}$/i.test(value);
}

// Ensure the variable is always an ObjectId
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
