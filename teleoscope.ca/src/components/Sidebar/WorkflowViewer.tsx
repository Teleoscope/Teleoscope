import { useState } from 'react';
import { Stack, TextField, List, ListItem, ListItemIcon, IconButton } from '@mui/material';
import Deleter from '@/components/Deleter';

import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import {
    initializeWorkflow,
    loadWorkflow,
    relabelWorkflow,
    removeWorkflow
} from '@/actions/appState';

import EditableText from '@/components/EditableText';

import { useSWRF } from '@/lib/swr';
import WindowDefinitions from '../WindowFolder/WindowDefinitions';
import { Workflows } from '@/types/workflows';

const styles = {
    overflow: 'auto',
    height: '100%',
    position: 'relative'
};

export default function WorkflowViewer(props) {
    const dispatch = useAppDispatch();

    const { workflow } = useAppSelector((state) => state.appState);
    const color = workflow.settings.color;

    const { data: workspace } = useSWRF(
        workflow?.workspace
            ? `/api/workspace?workspace=${workflow.workspace}`
            : null
    );

    const { data: workflows } = useSWRF(
        workspace
            ? `/api/workflows?workflows=${workspace?.workflows.join(',')}`
            : null
    );

    const [value, setValue] = useState("");

    const handleKeyDown = (e) => {
        if (e.code === 'Enter') {
            dispatch(initializeWorkflow({ label: value }));
            setValue("")
        }
    };

    const handleWorkflowChange = (wid) => {
        dispatch(loadWorkflow({ workflow_id: wid }));
    }

    return (
        <div style={styles}>
            <Stack>
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <TextField
                        label="Create new Workflow..."
                        placeholder="Type label and press enter."
                        variant="standard"
                        onKeyDown={handleKeyDown}
                        onChange={(e) => setValue(e.target.value)}
                        InputLabelProps={{
                            sx: { '&.Mui-focused': { color: color } }
                        }}
                        sx={{
                            width: '100%',
                            margin: 1,
                            '& .MuiInput-underline:after': {
                                borderBottomColor: color
                            }
                        }}
                    />
                </Stack>

                <List>
                    {workflows?.map((w: Workflows) => (
                        <div key={w._id} style={styles}>
                            <ListItem
                                sx={{
                                    border:
                                        w._id === workspace?.selected_workflow
                                            ? `1px solid ${w.settings.color}`
                                            : ''
                                }}
                            >
                                <Stack
                                    sx={{ width: '100%' }}
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                >
                                    <Stack direction="row" alignItems="center">
                                        <IconButton  onClick={() => handleWorkflowChange(w._id)}>
                                        <ListItemIcon>
                                                {WindowDefinitions(
                                                    'Workflows'
                                                ).icon(w.settings.color)}
                                        </ListItemIcon>
                                        </IconButton>
                                        <EditableText
                                            initialValue={w.label}
                                            callback={(label) =>
                                                dispatch(
                                                    relabelWorkflow({
                                                        relabeled_workflow_id:
                                                            w._id,
                                                        label: label
                                                    })
                                                )
                                            }
                                        />
                                    </Stack>
                                    <Stack direction="row">
                                        <Deleter
                                            callback={() =>
                                                dispatch(
                                                    removeWorkflow({
                                                        workflow_id: w._id
                                                    })
                                                )
                                            }
                                            color={props.color}
                                        ></Deleter>
                                    </Stack>
                                </Stack>
                            </ListItem>
                        </div>
                    ))}
                </List>
            </Stack>
        </div>
    );
}
