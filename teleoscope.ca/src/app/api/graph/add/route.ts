import { validateRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { dbOp } from '@/lib/db';
import { Db, InsertOneResult, MongoClient, ObjectId } from 'mongodb';
import { Graph } from '@/types/graph';
import { Groups } from '@/types/groups';
import { EditorState } from 'prosemirror-state';
import { Schema } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';

import randomColor from 'randomcolor';
import { Search } from '@/types/search';
import { Notes } from '@/types/notes';
import send from '@/lib/amqp';

async function insert(
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
function isObjectId(value: any): value is ObjectId {
    return value instanceof ObjectId;
}

// Validate if a string can be a valid ObjectId
function isValidObjectIdString(value: string): boolean {
    return /^[a-f\d]{24}$/i.test(value);
}

// Ensure the variable is always an ObjectId
function ensureObjectId(value: string | null | ObjectId): ObjectId {
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
async function MakeReference(
    type: string,
    reference: ObjectId,
    workspace_id: string
): Promise<ObjectId | null> {
    let res;
    switch (type) {
        case 'Search':
            const search: Search = {
                query: ''
            };
            res = await insert('searches', search);
            break;
        case 'Document':
            if (reference) {
                return reference;
            }
            break;
        case 'Group':
            const group: Groups = {
                color: randomColor(),
                label: 'New Group',
                workspace: ensureObjectId(workspace_id),
                docs: []
            };
            res = await insert('groups', group);
            break;
        case 'Note':
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
                label: 'New note',
                content: state.toJSON()
            };
            res = await insert('notes', note);
            
            break;
        case 'Rank':
            break;
        case 'Projection':
            break;
        case 'Union':
            break;
        case 'Divide':
            break;
        case 'Difference':
            break;
        case 'Intersection':
            break;
        case 'Exclusion':
            break;
    }

    return res ? res.insertedId : null;
}

export async function POST(request: NextRequest) {
    const { user } = await validateRequest();
    if (!user) {
        return NextResponse.json({ message: 'No user signed in.' });
    }

    const req = await request.json();

    const { uid, type, workflow_id, workspace_id, parameters } = req;


    const result = await dbOp(async (client: MongoClient, db: Db) => {
        const doc: Graph = {
            uid: uid,
            type: type,
            reference: null,
            workflow: new ObjectId(workflow_id),
            workspace: new ObjectId(workspace_id),
            status: 'Loading...',
            doclists: [],
            parameters: parameters,
            edges: {
                source: [],
                control: [],
                output: []
            }
        };
        const insert_result = await db
            .collection<Graph>('graph')
            .insertOne(doc);

        send('update_nodes', {
            workflow_id: workflow_id,
            workspace_id: workspace_id,
            nodes: [uid]
        });

        return insert_result;
    });
    return NextResponse.json(result);
}
