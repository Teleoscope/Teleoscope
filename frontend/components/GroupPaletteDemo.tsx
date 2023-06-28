// Groups.js
import React, { useContext } from "react";

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
import Tooltip from "@mui/material/Tooltip";
import DownloadIcon from "@mui/icons-material/Download";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CopyAllIcon from "@mui/icons-material/CopyAll";

// actions
import { useSWRHook } from "@/util/swr";
import { useAppSelector } from "@/util/hooks";

// contexts
import { useStomp } from "@/components/Stomp";
import randomColor from "randomcolor";
import { useCookies } from "react-cookie";
import ColorPicker from "@/components/ColorPicker";
import EditableText from "@/components/EditableText";
import ButtonActions from "@/components/ButtonActions";
import { onDragStart } from "@/util/drag";

// custom components
export default function GroupsDemo(props) {
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

  const ClusterButton = () => {
    return (
      <Tooltip title="Cluster on existing groups">
        <IconButton onClick={() => runClusters()}>
          <Diversity2Icon
            fontSize="small"
            sx={[
              {
                "&:hover": {
                  color: props.color,
                },
              },
            ]}
          />
        </IconButton>
      </Tooltip>
    );
  };

  const downloadGroups = () => { return 0 };

  const DownloadButton = () => {
    return (
      <Tooltip title="Download group content">
        <IconButton onClick={() => downloadGroups()}>
          <DownloadIcon
            fontSize="small"
            sx={[
              {
                "&:hover": {
                  color: props.color,
                },
              },
            ]}
          />
        </IconButton>
      </Tooltip>
    );
  };

  const fetchgroups = async () => {
    const out = [];
    for (const group of groups) {
      const g = group;
      g["included_text"] = [];
      for (const doc of g.history[0].included_documents) {
        const response = await fetch(
          `/api/${swr.subdomain}/document/${doc}`
        ).then((res) => res.json());
        g["included_text"].push(response);
      }
      out.push(g);
    }
    return out;
  };

  const copyTextToClipboard = async () => {
    const groups = await fetchgroups();
    let acc = "";
    for (const group of groups) {
      acc = acc + `${group.history[0].label}\n`;
      for (const text of group.included_text) {
        acc = acc + text.title;
        acc = acc + text.text;
      }
    }

    navigator.clipboard.writeText(acc);
  };
  const copyJsonToClipboard = async () => {
    const groups = await fetchgroups();
    navigator.clipboard.writeText(JSON.stringify(groups, null, 2));
  };

  const CopyText = () => {
    return (
      <Tooltip title="Copy text to clipboard">
        <IconButton onClick={copyTextToClipboard}>
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  };

  const CopyJson = () => {
    return (
      <Tooltip title="Copy metadata to clipboard">
        <IconButton onClick={copyJsonToClipboard}>
          <CopyAllIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  };

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
            width: "100%",
            margin: 1,
            // '& .MuiInput-underline:before': {borderBottomColor: props.color},
            "& .MuiInput-underline:after": { borderBottomColor: props.color },
            // '& .MuiInputLabel-root': {borderBottomColor: props.color},
          }}
        />
      </Stack>
      <Divider />
      <ButtonActions
        inner={[
          [CopyJson, {}],
          [CopyText, {}],
          [ClusterButton, {}],
        ]}
      />
      <List>
        {groups?.map((g) => {
          return (
            <div
              key={g._id}
              draggable={true}
              style={{ position: "relative" }}
              onDragStart={(e) =>
                onDragStart(e, g._id, "Group")
              }
            >
              <ListItem>
                <Stack
                  sx={{ width: "100%" }}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Stack direction="row" alignItems="center">
                    <ListItemIcon>
                      <IconButton
                        onClick={() => setShowColorPicker(!showColorPicker)}
                      >
                        <FolderIcon sx={{ color: g.history[0].color }} />
                      </IconButton>
                    </ListItemIcon>

                    <EditableText
                      initialValue={g.history[0].label}
                      callback={(label) => client.relabel_group(label, g._id)}
                    />
                  </Stack>
                  <IconButton
                    onClick={() => client.remove_group(g._id, session_id)}
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
              {showColorPicker ? (
                <ColorPicker
                  defaultColor={g.history[0].color}
                  onChange={(color) => {
                    client.recolor_group(color, g._id);
                    setShowColorPicker(false);
                  }}
                ></ColorPicker>
              ) : (
                <span></span>
              )}
            </div>
          );
        })}
      </List>
    </div>
  );
}
