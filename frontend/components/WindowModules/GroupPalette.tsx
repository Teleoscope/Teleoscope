// GroupPalette.js
import React from "react";

// MUI 
import TextField from "@mui/material/TextField";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import {createFilterOptions} from '@mui/material/Autocomplete';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Diversity2Icon from '@mui/icons-material/Diversity2';
import {Box, FormControl, FormHelperText, IconButton, InputLabel, MenuItem, Select, Typography} from "@mui/material";
import CheckIcon from '@mui/icons-material/Check';

// actions
import useSWRAbstract from "../../util/swr"
import {useAppSelector, useAppDispatch} from '../../hooks'
import {dragged} from "../../actions/windows";

// contexts
import {Stomp} from '../Stomp'
import randomColor from "randomcolor";
import {useCookies} from "react-cookie";
import ConnectingAirportsIcon from "@mui/icons-material/ConnectingAirports";

// custom components
export default function GroupPalette(props) {
    const {sessions} = useSWRAbstract("sessions", `/api/sessions/`);
    const {users} = useSWRAbstract("users", `/api/users/`);
    const userid = useAppSelector((state) => state.activeSessionID.userid);
    const client = Stomp.getInstance();
    client.userId = userid;
    const filter = createFilterOptions();
    const dispatch = useAppDispatch();
    const [value, setValue] = React.useState(null);
    const [sessionValue, setSessionValue] = React.useState({label: ''});
    const [groupValue, setGroupValue] = React.useState({label: null});
    const [groupName, setGroupName] = React.useState({label: null});

    const [cookies, setCookie] = useCookies(["user"]);
    const [open, toggleOpen] = React.useState(false);
    const session_id = useAppSelector((state) => state.activeSessionID.value);

    const {groups} = useSWRAbstract("groups", `/api/sessions/${session_id}/groups`);
    const group_labels = groups ? groups.map((g) => {return g.history[0].label}) : []
    const [showGroupsBool, setShowGroupsBool] = React.useState(false);
    const [showSubmitBool, setShowSubmitBool] = React.useState(false);

    const runClusters = () => {client.cluster_by_groups(groups.map(g => g._id), session_id)};

    const keyChange = (e) => {
        if (e.code == "Enter") {
            client.add_group(e.target.value, randomColor(), session_id)
        }
    };

    const handleClickOpen = () => {
        toggleOpen(true);
    };

    const handleClose = () => {
        setSessionValue({label: ''});
        resetGroupInfo()
        setShowGroupsBool(false)
        setShowSubmitBool(false)
        toggleOpen(false);
    };

    const resetGroupInfo = () => {
        setGroupValue({label: null});
        setGroupName({label: null});
    };

    const getSessions = (username) => {
        if (sessions && users) {
            for (const i in users) {
                const user = users[i];
                if (user["username"] == username && user["sessions"].length > 0) {
                    return user["sessions"].map((s) => {
                        const temp = sessions.find(ss => ss._id == s)
                        return (<MenuItem value={s}>{temp?.history[0].label}</MenuItem>)
                    })
                }
            }
        }
        return (<MenuItem value={null}>No sessions for this user...</MenuItem>)
    };

    const getGroups = (selectedSession) => {
        const currSession = sessions.find(ss => ss._id == selectedSession)
        if (currSession) {
            const groups = currSession.history[0]?.groups
            const groups_obj = useSWRAbstract("groups", `/api/sessions/${selectedSession}/groups`)

            if (groups.length == 0) {
                return <MenuItem value={null}>This session has no groups...</MenuItem>
            } else {
                return groups_obj.groups?.map((g) => {
                    return (<MenuItem value={g}>{g?.history[0].label}</MenuItem>)
                })
            }
        }
        return (<MenuItem value={null}>No session selected...</MenuItem>)
    };

    const groupChange = (e) => {
        if (e.target.value == "This session has no groups...") {
            resetGroupInfo()
        } else {
            setGroupValue({label: e.target.value})
            setGroupName({label: `${e.target.value.history[0].label} copy`})
        }
    };

    const submitCopyGroup = () => {
        if (groupValue.label && groupName.label) {
            client.copy_group(groupName.label, groupValue.label._id, session_id)
            handleClose()
        } else {
            console.log('ERROR - NO GROUP SELECTED')
        }
    };

    // ----------------- React Components ---------------

    const ChooseSession = () => {
        return (
            <FormControl
                sx={{width: 200, backgroundColor: 'white',}}
                variant="filled"
            >
                <InputLabel id="demo-simple-select-helper-label">Session</InputLabel>
                <Select
                    labelId="demo-simple-select-helper-label"
                    id="demo-simple-select-helper"
                    value={sessionValue.label}
                    label="Session"
                    size="small"
                    onChange={(event) => {
                        setSessionValue({label: event.target.value})
                        setShowGroupsBool(true)
                        setShowSubmitBool(false)
                    }}
                >
                    {getSessions(cookies.user)}
                </Select>
                <FormHelperText>Select Session</FormHelperText>
            </FormControl>
        )
    }

    const ChooseGroup = () => {
        return (
            <FormControl
                sx={{width: 200, backgroundColor: 'white',}}
                variant="filled"
            >
                <InputLabel id="demo-simple-select-helper-label">Group</InputLabel>
                <Select
                    labelId="demo-simple-select-helper-label"
                    id="demo-simple-select-helper"
                    value={groupValue.label}
                    label="Group"
                    size="small"
                    onChange={(event) => {
                        groupChange(event)
                        setShowSubmitBool(true)
                    }}
                >
                    {getGroups(sessionValue.label)}
                </Select>
                <FormHelperText>Select Group</FormHelperText>
            </FormControl>
        )
    }

    const ChooseName = () => {
        return (
            <FormControl
                sx={{width: 200, backgroundColor: 'white',}}
                variant="filled"
            >
                <TextField
                    id="filled-helperText"
                    label="Group Name"
                    defaultValue={groupName.label ? `${groupName.label}` : null}
                    variant="filled"
                    onChange={(event) =>
                        setGroupName({label: event.target.value})
                    }
                />
                <FormHelperText>Rename Group</FormHelperText>
            </FormControl>
        )
    }

    const ShowSubmitButton = () => {
        return (
            <IconButton onClick={() => {submitCopyGroup()}}>
                <CheckIcon/>
            </IconButton>
        )
    }

    const CopyGroup = () => {
        return (
            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>
                    <Typography align="center">Copy Group</Typography>
                </DialogTitle>
                <DialogContent>
                    <Box component="form" sx={{display: 'flex', flexWrap: 'wrap'}}>
                        <Stack direction="column" spacing={1} justifyContent="space-between" alignItems="center"
                               style={{margin: 0}}>

                            <ChooseSession/>
                            {showGroupsBool ? <ChooseGroup/> : null}
                            {showSubmitBool ? <ChooseName/> : null}
                            {showSubmitBool ? <ShowSubmitButton/> : null}

                        </Stack>
                    </Box>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <div style={{overflow: "auto", height: "100%"}}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" style={{margin: 0}}>
                <TextField
                    label="Create new group..."
                    placeholder="Type label and press enter."
                    variant="standard"
                    onKeyDown={(e) => keyChange(e)}
                    onChange={(e) => setValue(e.target.value)}
                    InputLabelProps={{
                        style: {color: props.color},
                    }}
                    sx={{
                        width: "75%",
                        margin: 1,
                        '& .MuiInput-underline:before': {borderBottomColor: props.color},
                        '& .MuiInput-underline:after': {borderBottomColor: props.color},
                        '& .MuiInputLabel-root': {borderBottomColor: props.color},
                    }}
                />

                <IconButton onClick={() => runClusters()}><Diversity2Icon sx={{color: props.color}}/></IconButton>
                <IconButton onClick={handleClickOpen}><ConnectingAirportsIcon sx={{color: props.color}}/></IconButton>
                <CopyGroup/>

            </Stack>
            <Divider/>

            <List>
                {group_labels.map((gl) => {
                    const the_group = groups.find(g => g.history[0].label == gl);

                    return (
                        <div
                            draggable={true}
                            onDragStart={(e:React.DragEvent<HTMLDivElement>):void => {
                                dispatch(dragged({id: the_group?._id + "%group", type: "Group"}))
                            }}
                        >
                            <ListItem>
                                <ListItemIcon>
                                    <FolderIcon sx={{color: the_group?.history[0].color}}/>
                                </ListItemIcon>
                                <ListItemText
                                    primary={gl}
                                    secondary={gl ? 'Description' : null}
                                />
                                <IconButton onClick={() => client.remove_group(the_group._id, session_id)}><DeleteIcon></DeleteIcon></IconButton>
                            </ListItem>
                        </div>
                    )
                })}
            </List>
        </div>
    )
}