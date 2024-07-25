// mui
import { Stack, Box } from '@mui/material';

// actions
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { RootState } from '@/lib/store';

// custom components
import DocumentListItem from '@/components/Documents/DocumentListItem';
import { NewItemForm } from '@/components/NewItemForm';
import randomColor from 'randomcolor';
import { makeGroupFromBookmarks } from '@/actions/appState';
import { Groups } from '@/types/groups';

export default function Bookmarks() {
    const { workflow, workspace } = useAppSelector(
        (state: RootState) => state.appState
    );
    const bookmarks = workflow.bookmarks;
    const dispatch = useAppDispatch();

    const handleMakeGroupFromBookmarks = (e) => {
        const new_group: Groups = {
            label: e.target.value,
            color: randomColor(),
            docs: bookmarks,
            workspace: workspace._id
        };

        dispatch(makeGroupFromBookmarks(new_group));
    };

    return (
        <Stack direction="column">
            {bookmarks.length > 0 ? (
                <NewItemForm
                    label={'Create group from bookmarks...'}
                    HandleSubmit={handleMakeGroupFromBookmarks}
                />
            ) : (
                <></>
            )}

            <Box>
                {bookmarks.map((docid) => (
                    <DocumentListItem key={docid} id={docid}>
                        {' '}
                    </DocumentListItem>
                ))}
            </Box>
        </Stack>
    );
}
