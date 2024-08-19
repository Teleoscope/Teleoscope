// mui
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';

import NoteEditor from './NoteEditor';

export default function Note({ data: note }) {
    return (
        <Card
            sx={{
                backgroundColor: 'white',
                height: '100%',
                boxShadow: '0',
            }}
        >
            <div style={{ overflow: 'auto', height: '100%' }}>
                <Stack
                    direction="row"
                    sx={{
                        marginLeft: '10px',
                        width: '95%',
                        height: '100%',
                        cursor: 'text',
                    }}
                >
                    <NoteEditor note={note} />
                </Stack>
            </div>
        </Card>
    );
}
