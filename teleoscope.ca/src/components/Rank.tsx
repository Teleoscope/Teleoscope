// custom components
import DocumentList from '@/components/Documents/DocumentList';
import Count from '@/components/Count';

import {
    Box,
    IconButton,
    Slider,
    Stack,
    Tooltip,
    Typography
} from '@mui/material';
import ButtonActions from '@/components/ButtonActions';
import Histogram from '@/components/Histogram';
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { copyDoclistsToGroups, updateNode } from '@/actions/appState';
import { WindowProps } from './WindowFolder/WindowFactory';
import { useEffect, useState } from 'react';

// Custom tooltip component
function ValueLabelComponent({ children, value }) {
    return (
        <Tooltip placement="bottom" title={`${value}`}>
            {children}
        </Tooltip>
    );
}

const DistanceSlider = ({ rank, color }) => {
    const dispatch = useAppDispatch();
    const handleChange = (event, value) =>
        dispatch(
            updateNode({
                node_id: rank._id,
                parameters: { distance: value }
            })
        );

    return (
        <Slider
            slots={{
                valueLabel: ValueLabelComponent
            }}
            style={{
                width: '25%'
            }}
            aria-label="Distance"
            defaultValue={
                rank['parameters']['distance']
                    ? rank['parameters']['distance']
                    : '0.1'
            }
            valueLabelDisplay="auto"
            step={0.1}
            size="small"
            min={0.1}
            max={1}
            sx={{ color: color }}
            onChangeCommitted={(event, value) => handleChange(event, value)}
        />
    );
};

export default function Rank({
    reactflow_node,
    graph_node: rank
}: WindowProps) {
    const { color } = useAppSelector(
        (state) => state.appState.workflow.settings
    );

    const [version, setVersion] = useState(0);

    const doclists = rank?.doclists ? rank.doclists : [];

    useEffect(() => {
        setVersion((prevVersion) => prevVersion + 1);
    }, [rank])

    const key = rank?.uid + (doclists.length || 0);


    if (!rank) {
        return <>Rank loading...</>
    }

    const Status = (rank) => {
        if (rank) {
            if (rank.doclists.length > 0) {
                return (
                    <Stack
                        direction="row"
                        sx={{ width: '100%' }}
                        spacing={2}
                        alignItems="center"
                        justifyContent="center"
                    >
                        <Count
                            label="Number of results"
                            loading={rank ? false : true}
                            count={rank.doclists.reduce(
                                (a, d) => a + d.ranked_documents.length,
                                0
                            )}
                        />
                        <Histogram
                            data={rank.doclists[0].ranked_documents}
                        ></Histogram>
                        <DistanceSlider color={color} rank={rank} />
                    </Stack>
                );
            } else if (rank.edges.control.length > 0) {
                return (
                    <Stack
                        direction="row"
                        sx={{ width: '100%' }}
                        spacing={2}
                        alignItems="center"
                        justifyContent="center"
                    >
                        <Typography
                            sx={{ width: '100%' }}
                            align="center"
                            variant="caption"
                        >
                            {rank.status}
                        </Typography>
                    </Stack>
                );
            } else {
                return <DistanceSlider color={color} rank={rank} />;
            }
        }

        return null;
    };

    const CopyToGroup = (rank) => {
        const dispatch = useAppDispatch();
        return (
            <Tooltip
                title="Copy Doclists to Groups"
                key="Copy Doclists to Groups"
            >
                <IconButton
                    onClick={() =>
                        dispatch(copyDoclistsToGroups({ node_id: rank._id }))
                    }
                >
                    <FolderCopyIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        );
    };

    return (
        <Stack key={key} direction="column" sx={{ height: "100%" }}>

            <ButtonActions
                inner={[
                    [Status, rank],
                    [CopyToGroup, rank]
                ]}
            ></ButtonActions>
            <Box sx={{ flexGrow: 1, flexDirection: 'column' }}>
                <DocumentList data={doclists} pagination={true}></DocumentList>
            </Box>
    </Stack>
    );
}
