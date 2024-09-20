import randomColor from 'randomcolor';

import { IconButton, Tooltip } from '@mui/material';
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import { useAppDispatch } from '@/lib/hooks';
import { copyDoclistsToGroups } from '@/actions/appState';
import { Graph } from '@/types/graph';
import { Groups } from '@/types/groups';

const CopyToGroup = ({
    node,
    workspace
}: {
    node: Graph;
    workspace: string;
}) => {
    const dispatch = useAppDispatch();
    return (
        <Tooltip title="Copy Doclists to Groups" key="Copy Doclists to Groups">
            <IconButton
                onClick={() => {
                    const group: Groups = {
                        color: randomColor(),
                        docs: node.doclists.reduce(
                            (acc, curr) =>
                                acc.concat(
                                    curr.ranked_documents.map((d) => d[0])
                                ),
                            []
                        ),
                        label: 'Group from Node',
                        workspace: workspace
                    };
                    dispatch(copyDoclistsToGroups(group));
                }}
            >
                <FolderCopyIcon fontSize="small" />
            </IconButton>
        </Tooltip>
    );
};

export default CopyToGroup;
