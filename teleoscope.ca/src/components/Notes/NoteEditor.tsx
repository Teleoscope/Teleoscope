import { type Transaction } from 'prosemirror-state';
import 'prosemirror-view/style/prosemirror.css';
import { useCallback, useEffect, useState } from 'react';
import type { NodeViewComponentProps } from '@nytimes/react-prosemirror';
import { ProseMirror, useNodeViews } from '@nytimes/react-prosemirror';

import NoteMenu from './NoteMenu';
import ProseMirrorContext from '@/context/ProseMirrorContext';
import { schema } from '@/lib/schemas';
import { saveNote } from '@/actions/appState';
import { useDispatch } from 'react-redux';
import {
    baseKeymap,
    chainCommands,
    createParagraphNear,
    liftEmptyBlock,
    newlineInCode,
    splitBlock,
    toggleMark
} from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { Node } from 'prosemirror-model';
import { liftListItem, splitListItem } from 'prosemirror-schema-list';
import { EditorState } from 'prosemirror-state';
import 'prosemirror-view/style/prosemirror.css';

import { react } from '@nytimes/react-prosemirror';


export function Paragraph({ children }: NodeViewComponentProps) {
    return <p>{children}</p>;
}

export function List({ children }: NodeViewComponentProps) {
    return <ul>{children}</ul>;
}

export function ListItem({ children }: NodeViewComponentProps) {
    return <li>{children}</li>;
}

export const reactNodeViews = {
    paragraph: () => ({
        component: Paragraph,
        dom: document.createElement('div'),
        contentDOM: document.createElement('span')
    }),
    list: () => ({
        component: List,
        dom: document.createElement('div'),
        contentDOM: document.createElement('div')
    }),
    list_item: () => ({
        component: ListItem,
        dom: document.createElement('div'),
        contentDOM: document.createElement('div')
    })
};


const makePlugins = () => {
    return [
        keymap({
            ...baseKeymap,
            Enter: chainCommands(
                newlineInCode,
                createParagraphNear,
                liftEmptyBlock,
                splitListItem(schema.nodes.list_item),
                splitBlock
            ),
            'Shift-Enter': baseKeymap.Enter,
            'Shift-Tab': liftListItem(schema.nodes.list_item),
            'Mod-b': toggleMark(schema.marks.strong),
            'Mod-i': toggleMark(schema.marks.em)
        }),
        react()
    ];
};

const createState = (doc: Node) =>
    EditorState.create({
        doc,
        schema,
        plugins: makePlugins()
    });

const defaultState = createState(
    schema.topNodeType.create(null, [
        schema.nodes.paragraph.createAndFill()!,
        schema.nodes.list.createAndFill()!
    ])
);

const parseEditor = (state: JSON) => {
    return EditorState.fromJSON(
        { schema: schema, plugins: makePlugins() },
        state
    );
};

export default function NoteEditor({ note }) {
    const { nodeViews, renderNodeViews } = useNodeViews(reactNodeViews);
    const [mount, setMount] = useState<HTMLDivElement | null>(null);
    const [state, setState] = useState(defaultState);

    const dispatch = useDispatch();

    const dispatchTransaction = useCallback(
        (tr: Transaction) => setState((oldState) => oldState.apply(tr)),
        []
    );

    useEffect(() => {
        if (note) {
            try {
                const e = parseEditor(note.content);
                setState(e);
            } catch (error) {
                console.log(note, state, error);
                throw Error(error);
            }
        }
    }, [note, state]);

    if (!note) {
        return <>Loading note...</>;
    }
    const handleBlur = () => {
        dispatch(
            saveNote({
                note: note,
                content: state.toJSON(),
                text: state.doc.textBetween(0, state.doc.content.size, '\n\n')
            })
        );
    };

    return (
        <ProseMirrorContext.Provider
            value={{ editorState: state, dispatch: dispatchTransaction }}
        >
            <div className="w-full" onBlur={handleBlur}>
                <div className="mb-2">
                    <NoteMenu />
                </div>
                <ProseMirror
                    mount={mount}
                    state={state}
                    nodeViews={nodeViews}
                    dispatchTransaction={dispatchTransaction}
                >
                    {renderNodeViews()}
                    <div
                        ref={setMount}
                        className="w-full prose border border-gray-300 rounded-md p-4 outline-none min-h-[700px]"
                    />
                </ProseMirror>
            </div>
        </ProseMirrorContext.Provider>
    );
}
