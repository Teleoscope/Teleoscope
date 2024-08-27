import React, { useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Typography, Stack, Divider } from '@mui/material';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import DocumentList from '@/components/Documents/DocumentList';
import WindowDefinitions from '../WindowFolder/WindowDefinitions';
import { Doclist } from '@/types/graph';
import { useSWRF } from '@/lib/swr';
import EditableText from '@/components/EditableText'; // Assuming this is the component you want to use for editing
import { relabelStorage } from '@/actions/appState'; // Assuming this is the action to update the label
import { onDragStart } from '@/lib/drag';

const DataViewer = ({ id, type }) => {
    const { data: storage } = useSWRF(`/api/storage?storage=${id}`);
    const doclists: Doclist[] = [
        {
            reference: id,
            uid: null,
            type: 'Storage',
            ranked_documents: storage?.docs.map((doc) => [doc, 1.0])
        }
    ];
    const { settings } = useAppSelector((state) => state.appState.workspace);
    const { color } = useAppSelector(
        (state) => state.appState.workflow.settings
    );
    const dispatch = useAppDispatch();

    const handleLoadMore = () => {};

    // State for context menu and editing
    const [isEditing, setIsEditing] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
        setAnchorEl(event.currentTarget);
        setIsEditing(!isEditing);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <Accordion
            defaultExpanded={settings?.expanded}
            disableGutters={true}
            square={true}
            disabled={isEditing}
            onContextMenu={handleContextMenu} // Attach context menu handler
        >
            {isEditing ? (
                <EditableText
                    initialValue={storage ? storage.label : 'Loading...'}
                    callback={(label) => {
                        dispatch(
                            relabelStorage({
                                label: label,
                                storage_id: id
                            })
                        );
                        setIsEditing(false); // Exit editing mode after label update
                    }}
                    startEditing={true}
                />
            ) : (
                <AccordionSummary
                    draggable={true}
                    expandIcon={!isEditing && <ExpandMoreIcon />} // Hide expand icon when editing
                    aria-controls="panel3a-content"
                    id="panel3a-header"
                    onDragStart={(event) => onDragStart(event, id, 'Storage')}
                >
                    <Typography noWrap align="left">
                        {WindowDefinitions('Storage').icon(color)}{' '}
                        {storage ? storage.label : 'Loading...'}
                    </Typography>
                </AccordionSummary>
            )}
            <AccordionDetails>
                <Stack spacing={1} sx={{ margin: '1em' }}>
                    <Divider></Divider>
                    <div style={{ height: '25vh' }}>
                        <DocumentList

                            data={doclists || []}
                            pagination={true}
                            loadMore={handleLoadMore}
                        ></DocumentList>
                    </div>
                </Stack>
            </AccordionDetails>
        </Accordion>
    );
};

export default DataViewer;
