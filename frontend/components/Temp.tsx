// Groups.js
import React from "react";

// MUI
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import FolderIcon from "@mui/icons-material/Folder";
import DeleteIcon from "@mui/icons-material/Delete";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Diversity2Icon from "@mui/icons-material/Diversity2";
import FolderCopyIcon from "@mui/icons-material/FolderCopy";

import {
  Box,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";

// actions 
import { useSWRHook } from "@/util/swr";
import { useAppSelector } from "@/util/hooks";

// contexts
import { useStomp } from "@/components/Stomp";
import randomColor from "randomcolor";
import { useCookies } from "react-cookie";
import ConnectingAirportsIcon from "@mui/icons-material/ConnectingAirports";
import ColorPicker from "@/components/ColorPicker";
import EditableText from "@/components/EditableText";
import withDroppable from "@/components/DropItem";

// custom components
export default function Groups(props) {
  const swr = useSWRHook();
  const { sessions } = swr.useSWRAbstract("sessions", `sessions/`);
  const { users } = swr.useSWRAbstract("users", `users/`);
  const client = useStomp();

  const [value, setValue] = React.useState(null);
  const [sessionValue, setSessionValue] = React.useState({ label: "" });
  const [groupValue, setGroupValue] = React.useState({ label: null });
  const [groupName, setGroupName] = React.useState({ label: null });

  const [cookies, setCookie] = useCookies(["user"]);
  const [open, toggleOpen] = React.useState(false);
  const session_id = useAppSelector((state) => state.activeSessionID.value);

  const { groups } = swr.useSWRAbstract(
    "groups",
    `sessions/${session_id}/groups`
  );

  const [showGroupsBool, setShowGroupsBool] = React.useState(false);
  const [showSubmitBool, setShowSubmitBool] = React.useState(false);
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  const runClusters = () => {
    client.cluster_by_groups(
      groups.map((g) => g._id),
      session_id
    );
  };

  const keyChange = (e) => {
    if (e.code == "Enter") {
      client.add_group(e.target.value, randomColor(), session_id);
    }
  };

  const handleClickOpen = () => {
    toggleOpen(true);
  };

  const handleClose = () => {
    setSessionValue({ label: "" });
    resetGroupInfo();
    setShowGroupsBool(false);
    setShowSubmitBool(false);
    toggleOpen(false);
  };

  const resetGroupInfo = () => {
    setGroupValue({ label: null });
    setGroupName({ label: null });
  };

  const getSessions = (username) => {
    if (sessions && users) {
      for (const i in users) {
        const user = users[i];
        if (user["username"] == username && user["sessions"].length > 0) {
          return user["sessions"].map((s) => {
            const temp = sessions.find((ss) => ss._id == s);
            return <MenuItem value={s}>{temp?.history[0].label}</MenuItem>;
          });
        }
      }
    }
    return <MenuItem value={null}>No sessions for this user...</MenuItem>;
  };

  const getGroups = (selectedSession) => {
    const currSession = sessions.find((ss) => ss._id == selectedSession);
    if (currSession) {
      const groups = currSession.history[0]?.groups;
      const groups_obj = swr.useSWRAbstract(
        "groups",
        `sessions/${selectedSession}/groups`
      );

      if (groups.length == 0) {
        return <MenuItem value={null}>This session has no groups...</MenuItem>;
      } else {
        return groups_obj.groups?.map((g) => {
          return <MenuItem value={g}>{g?.history[0].label}</MenuItem>;
        });
      }
    }
    return <MenuItem value={null}>No session selected...</MenuItem>;
  };

  const groupChange = (e) => {
    if (e.target.value == "This session has no groups...") {
      resetGroupInfo();
    } else {
      setGroupValue({ label: e.target.value });
      setGroupName({ label: `${e.target.value.history[0].label} copy` });
    }
  };

  const submitCopyGroup = () => {
    if (groupValue.label && groupName.label) {
      client.copy_group(groupName.label, groupValue.label._id, session_id);
      handleClose();
    }
  };

  // ----------------- React Components ---------------

  const ChooseSession = () => {
    return (
      <FormControl
        sx={{ width: 200, backgroundColor: "white" }}
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
            setSessionValue({ label: event.target.value });
            setShowGroupsBool(true);
            setShowSubmitBool(false);
          }}
        >
          {getSessions(cookies.user)}
        </Select>
        <FormHelperText>Select Session</FormHelperText>
      </FormControl>
    );
  };

  const ChooseGroup = () => {
    return (
      <FormControl
        sx={{ width: 200, backgroundColor: "white" }}
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
            groupChange(event);
            setShowSubmitBool(true);
          }}
        >
          {getGroups(sessionValue.label)}
        </Select>
        <FormHelperText>Select Group</FormHelperText>
      </FormControl>
    );
  };

  const ChooseName = () => {
    return (
      <FormControl
        sx={{ width: 200, backgroundColor: "white" }}
        variant="filled"
      >
        <TextField
          id="filled-helperText"
          label="Group Name"
          defaultValue={groupName.label ? `${groupName.label}` : null}
          variant="filled"
          onChange={(event) => setGroupName({ label: event.target.value })}
        />
        <FormHelperText>Rename Group</FormHelperText>
      </FormControl>
    );
  };

  const ShowSubmitButton = () => {
    return (
      <IconButton
        onClick={() => {
          submitCopyGroup();
        }}
      >
        <CheckIcon />
      </IconButton>
    );
  };

  const CopyGroup = () => {
    return (
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>
          <Typography align="center">Copy Group</Typography>
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: "flex", flexWrap: "wrap" }}>
            <Stack
              direction="column"
              spacing={1}
              justifyContent="space-between"
              alignItems="center"
              style={{ margin: 0 }}
            >
              <ChooseSession />
              {showGroupsBool ? <ChooseGroup /> : null}
              {showSubmitBool ? <ChooseName /> : null}
              {showSubmitBool ? <ShowSubmitButton /> : null}
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>
    );
  };

  const Picker = (props) => {
    return (
      <ColorPicker
        defaultColor={props.group?.history[0].color}
        onChange={(color) => {
          client.recolor_group(color, props.group._id);
          setShowColorPicker(false);
        }}
      ></ColorPicker>
    );
  };

  const Item = (props) => {
    return (
      <ListItem>
        <Stack
          sx={{ width: "100%" }}
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" alignItems="center">
            <ListItemIcon>
              <IconButton onClick={() => setShowColorPicker(!showColorPicker)}>
                <FolderIcon sx={{ color: props.group?.history[0].color }} />
              </IconButton>
            </ListItemIcon>

            <EditableText
              initialValue={props.group.history[0].label}
              callback={(label) => client.relabel_group(label, props.group._id)}
            />
          </Stack>
          <IconButton
            onClick={() => client.remove_group(props.group._id, session_id)}
          >
            <DeleteIcon
              sx={[
                {
                  "&:hover": {
                    color: props.color,
                  },
                },
              ]}
            ></DeleteIcon>
          </IconButton>
        </Stack>
      </ListItem>
    );
  };

  const Test = (props) => {
    return (
      <IconButton onClick={() => console.log("problem")} {...props}>
        <FolderCopyIcon fontSize="inherit" />
      </IconButton>
    );
  };

  const Droppable = withDroppable(Test);

  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        style={{ margin: 0 }}
      >
        <TextField
          label="Create new group..."
          placeholder="Type label and press enter."
          variant="standard"
          onKeyDown={(e) => keyChange(e)}
          onChange={(e) => setValue(e.target.value)}
          InputLabelProps={{
            sx: {
              "&.Mui-focused": {
                color: props.color,
              },
            },
          }}
          sx={{
            width: "75%",
            margin: 1,
            // '& .MuiInput-underline:before': {borderBottomColor: props.color},
            "& .MuiInput-underline:after": { borderBottomColor: props.color },
            // '& .MuiInputLabel-root': {borderBottomColor: props.color},
          }}
        />

        <IconButton onClick={() => runClusters()}>
          <Diversity2Icon
            sx={[
              {
                "&:hover": {
                  color: props.color,
                },
              },
            ]}
          />
        </IconButton>
        <IconButton onClick={handleClickOpen}>
          <ConnectingAirportsIcon
            sx={[
              {
                "&:hover": {
                  color: props.color,
                },
              },
            ]}
          />
        </IconButton>
        <CopyGroup />
      </Stack>
      <Divider />

      <List>
        {groups?.map((g) => {
          return (
            <div>
              <Droppable
                group={g}
                id={g._id}
                type="Group"
                typetag="group"
                {...props}
              />
              {showColorPicker ? <Picker group={g} /> : <span></span>}
            </div>
          );
        })}
      </List>
    </div>
  );
}
