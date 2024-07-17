import React, { useState } from 'react';
import {
    IconButton,
    Stack,
    List,
    Menu,
    Typography,
    ToggleButtonGroup,
    FormControl,
    InputLabel,
    MenuItem,
    Select
} from '@mui/material';
import PopupState, { bindTrigger, bindMenu } from 'material-ui-popup-state';
import { useAppSelector } from '@/lib/hooks';
import ToggleButton from '@mui/material/ToggleButton';
import { Box } from '@mui/system';
import DocumentListItem from '../Documents/DocumentListItem';
import { useSWRF } from '@/lib/swr';

const styles = {
    overflow: 'auto',
    height: '100%',
    position: 'relative'
};

const PopoverButton = ({ popupState, children, icon }) => (
    <React.Fragment>
        <IconButton variant="contained" {...bindTrigger(popupState)}>
            {icon}
        </IconButton>
        <Menu {...bindMenu(popupState)}>{children}</Menu>
    </React.Fragment>
);

const renderPopupButton = (popupId, icon, children) => (
    <PopupState variant="popover" popupId={popupId}>
        {(popupState) => (
            <PopoverButton popupState={popupState} icon={icon}>
                {children}
            </PopoverButton>
        )}
    </PopupState>
);

export default function References(props) {
    const selection = useAppSelector((state) => state.appState.workflow.selection.nodes);
    const selected = selection.nodes.filter((n) => n.data.type == 'Document');
    const { data: document } = useSWRF(`/api/document?document=${selected[0].id.split('%')[0]}`)

    const userid = data?.user?.id;

    const [selectedGroup, setSelectedGroup] = useState<string>(
        Object.keys(document?.metadata?.references || {})[0]
    );
    const [selectedGroupIndex, setSelectedGroupIndex] = useState<
        'refers_to' | 'referred_by'
    >('refers_to');
    let referenceGroups = document?.metadata?.references || {};

    if (Object.keys(referenceGroups).length == 0) {
        return (
            <Stack>
                <Typography variant="h6">No references found</Typography>
            </Stack>
        );
    }

    return (
        <div>
            <Stack>
                <Box
                    sx={{
                        display: 'flex',
                        width: '100%',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <FormControl sx={{ display: 'flex', width: '100%' }}>
                        <InputLabel id="demo-simple-select-label">
                            Type
                        </InputLabel>
                        <Select
                            labelId="reference-group-select"
                            id="reference-group-select"
                            value={selectedGroup}
                            label="Type"
                            onChange={(e) => setSelectedGroup(e.target.value)}
                        >
                            {Object.keys(referenceGroups).map((group) => (
                                <MenuItem value={group}>{group}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <ToggleButtonGroup
                        color="primary"
                        sx={{
                            p: '0.2rem',
                            fontSize: '0.8rem',
                            margin: '0rem',
                            height: '4rem',
                            textWrap: 'nowrap'
                        }}
                        // value={alignment}
                        exclusive
                        // onChange={handleChange}
                        aria-label="Platform"
                    >
                        <ToggleButton
                            value="refers_to"
                            sx={{
                                p: '0.5rem',
                                fontSize: '0.8rem',
                                margin: '0rem',
                                textWrap: 'nowrap'
                            }}
                            onClick={() => setSelectedGroupIndex('refers_to')}
                        >
                            Refers To
                        </ToggleButton>
                        <ToggleButton
                            sx={{
                                p: '0.5rem',
                                fontSize: '0.8rem',
                                margin: '0rem',
                                textWrap: 'nowrap'
                            }}
                            value="referred_by"
                            onClick={() => setSelectedGroupIndex('referred_by')}
                        >
                            Referred By
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>
                <List
                    sx={{
                        width: '100%',
                        bgcolor: 'background.paper',
                        padding: '0.5rem',
                        gap: '5rem'
                    }}
                >
                    {referenceGroups[selectedGroup] &&
                        referenceGroups[selectedGroup][selectedGroupIndex].map(
                            (reference) => (
                                <Stack spacing={2} direction="column">
                                    <DocumentListItem
                                        showReadIcon={true}
                                        setIndex={1}
                                        listIndex={1}
                                        group={1}
                                        highlight={false}
                                        test={true}
                                        key={reference}
                                        {...props}
                                        id={reference}
                                        index={'id'}
                                    />
                                </Stack>
                            )
                        )}

                    {/* {referenceGroups[selectedGroup][selectedGroupIndex].length == 0 &&
             <Typography variant="subtitle1" align="center"
             >No references found</Typography>
          } */}
                </List>
            </Stack>
        </div>
    );
}
