// mui
import { Stack, List, ListItem, ListItemIcon } from '@mui/material';

// import { ContentState, convertToRaw } from 'draft-js';

// custom
import EditableText from '@/components/EditableText';
import Deleter from '@/components/Deleter';

// actions
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { RootState } from '@/lib/store';

import { addNote, relabelNote, removeNote } from '@/actions/appState';

// utils
import { NewItemForm } from '@/components/NewItemForm';
import { onDragStart } from '@/lib/drag';
import { useSWRF } from '@/lib/swr';
import { Notes } from '@/types/notes';
import WindowDefinitions from '../WindowFolder/WindowDefinitions';

const DeleteItem = ({ id }: { id: string }) => {
    const settings = useAppSelector(
        (state) => state.appState.workflow.settings
    );
    const { data: graph_item } = useSWRF(`/api/graph?oid=${id}`);
    const dispatch = useAppDispatch();


    const uid = graph_item?.uid;
    return (
        <Deleter
            callback={() => dispatch(removeNote({ oid: id, uid: uid }))}
            color={settings.color}
        />
    );
};

export default function NotesList() {
    const workspace = useAppSelector(
        (state: RootState) => state.appState.workspace._id
    );

    const settings = useAppSelector(
        (state) => state.appState.workflow.settings
    );

    const { data: notes_raw } = useSWRF(
        workspace ? `/api/notes?workspace=${workspace}` : null
    );
    const dispatch = useAppDispatch();

    const notes: Array<Notes> = notes_raw?.map((n: Notes) => {
        const ret = {
            _id: n._id,
            label: n.label
        };
        return ret;
    });

    const handleNewNote = (e) => {
        // const content = convertToRaw(ContentState.createFromText(' '));

        dispatch(addNote({ label: e.target.value }));
    };

    return (
        <div style={{ overflow: 'auto', height: '100%' }}>
            <NewItemForm label="Create new note" HandleSubmit={handleNewNote} />
            <List>
                {notes?.map((n) => (
                    <div
                        key={n._id}
                        draggable={true}
                        style={{ position: 'relative' }}
                        onDragStart={(e) => onDragStart(e, n._id, 'Note')}
                    >
                        <ListItem key={n._id}>
                            <Stack
                                sx={{ width: '100%' }}
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                            >
                                <Stack direction="row" alignItems="center">
                                    <ListItemIcon>
                                        {WindowDefinitions('Note').icon(
                                            settings.color
                                        )}
                                    </ListItemIcon>

                                    <EditableText
                                        initialValue={n.label}
                                        callback={(label) =>
                                            dispatch(
                                                relabelNote({
                                                    note_id: n._id,
                                                    label: label
                                                })
                                            )
                                        }
                                    />
                                </Stack>
                                <DeleteItem id={n._id}></DeleteItem>
                            </Stack>
                        </ListItem>
                    </div>
                ))}
            </List>
        </div>
    );
}
