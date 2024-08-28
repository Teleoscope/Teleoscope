import { useState, useEffect } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Typography, Stack, Divider, IconButton, Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import DocumentList from '@/components/Documents/DocumentList';
import WindowDefinitions from '../WindowFolder/WindowDefinitions';
import { Doclist } from '@/types/graph';
import { useSWRF } from '@/lib/swr';
import EditableText from '@/components/EditableText';
import { relabelStorage, removeStorage } from '@/actions/appState';
import { onDragStart } from '@/lib/drag';
import Deleter from '../Deleter';

const DataViewer = ({ id, type }) => {
    const { data: storage } = useSWRF(id ? `/api/storage?storage=${id}` : null);
    const doclists: Doclist[] = [
        {
            reference: id,
            uid: null,
            type: 'Storage',
            ranked_documents: storage?.docs.map((doc) => [doc, 1.0])
        }
    ];

    const { settings } = useAppSelector((state) => state.appState.workspace);
    const { color } = useAppSelector((state) => state.appState.workflow.settings);
    const dispatch = useAppDispatch();
    const [isEditing, setIsEditing] = useState(false);
    const [tempLabel, setTempLabel] = useState('');
    const [initialLabel, setInitialLabel] = useState('');
    const [isExpanded, setIsExpanded] = useState(settings?.expanded || false);

    useEffect(() => {
        if (storage) {
            setTempLabel(storage.label || '');
            setInitialLabel(storage.label || '');
        }
    }, [storage]);

    useEffect(() => {
        if (isEditing) {
            setIsExpanded(true); // Ensure accordion stays expanded when editing
        }
    }, [isEditing]);

    const handleEditClick = () => {
        setIsEditing(true);
    };

    const handleSaveClick = () => {
        if (tempLabel !== initialLabel) {
            dispatch(relabelStorage({ label: tempLabel, storage_id: id }));
        }
        setIsEditing(false);
    };

    const handleCancelClick = () => {
        setTempLabel(initialLabel);
        setIsEditing(false);
    };

    const handleDeleteClick = () => {
        dispatch(removeStorage({ storage_id: id }));
        setIsEditing(false);
    };

    const handleAccordionChange = (event, expanded) => {
        if (!isEditing) {
            setIsExpanded(expanded);
        }
    };

    const handleLoadMore = () => {};

    return (
        <Accordion
            expanded={isExpanded}
            onChange={handleAccordionChange}
            disableGutters={true}
            square={true}
            disabled={isEditing} // Disable interaction while editing
        >
            <AccordionSummary
                draggable={!isEditing}
                expandIcon={<ExpandMoreIcon />}
                aria-controls="panel-content"
                id="panel-header"
                onDragStart={(event) => onDragStart(event, id, 'Storage')}
            >
                <Typography noWrap align="left">
                    {WindowDefinitions('Storage').icon(color)}{' '}
                    {storage ? storage.label : 'Loading...'}
                </Typography>
                {!isEditing && (
                    <IconButton
                        size="small"
                        onClick={handleEditClick}
                        sx={{ marginLeft: 'auto' }}
                    >
                        <EditIcon />
                    </IconButton>
                )}
            </AccordionSummary>

            {isEditing && (
                <AccordionDetails>
                    <Stack direction="column">
                        <Typography>Edit label</Typography>
                        <Stack direction="row" justifyContent="space-between" spacing={2}>
                            <EditableText
                                initialValue={tempLabel}
                                callback={(label) => setTempLabel(label)}
                                startEditing={true}
                            />
                            <Stack direction="row" spacing={1}>
                                <Button variant="outlined" color="primary" onClick={handleSaveClick}>
                                    Save
                                </Button>
                                <Button variant="outlined" color="secondary" onClick={handleCancelClick}>
                                    Cancel
                                </Button>
                                <Deleter callback={handleDeleteClick} color={color} />
                            </Stack>
                        </Stack>
                    </Stack>
                </AccordionDetails>
            )}

            {!isEditing && (
                <AccordionDetails>
                    <Stack spacing={1} sx={{ margin: '1em' }}>
                        <Divider />
                        <div style={{ height: '25vh' }}>
                            <DocumentList
                                data={doclists || []}
                                pagination={true}
                                loadMore={handleLoadMore}
                            />
                        </div>
                    </Stack>
                </AccordionDetails>
            )}
        </Accordion>
    );
};

export default DataViewer;
