import { useState } from "react";

// Mui imports
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import FolderIcon from "@mui/icons-material/Folder";
import Tooltip from "@mui/material/Tooltip";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import FolderCopyIcon from "@mui/icons-material/FolderCopy";
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { removeDocumentFromGroup, addDocumentToGroup } from "@/actions/windows";

//utils
import { useSWRHook } from "@/util/swr";

export default function GroupSelector(props) {
  const dispatch = useAppDispatch()

  const workflow_id = useAppSelector((state) => state.activeSessionID.value);
  const swr = useSWRHook();
  const { groups } = swr.useSWRAbstract(
    "groups",
    `sessions/${workflow_id}/groups`
  );

  const groups_this_document_belongs_to = groups
    ? groups.filter((g) => {
        return g.history[0].included_documents.includes(props.id);
      })
    : [];

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (group_id) => {
    if (groups_this_document_belongs_to.find((item) => item.id == props.id)) {
      dispatch(removeDocumentFromGroup({group_id: group_id, document_id: props.id}));
    } else {
      dispatch(addDocumentToGroup({group_id: group_id, document_id: props.id}));
    }
    handleClose();
  };

  const GroupIconHandler = (props) => {

    if (props.groups.length >= 1) {
      const g = props.groups[0].history[0];
      return (
        <Tooltip title={g.label}>
          <IconButton onClick={handleClick}>
            <FolderCopyIcon sx={{ color: g.color }} style={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      );
    }
    return (
      <Tooltip title="No group assigned...">
        <IconButton onClick={handleClick}>
          <FolderOutlinedIcon
            sx={{ color: "#BBBBBB" }}
            style={{ fontSize: 15 }}
          />
        </IconButton>
      </Tooltip>
    );
  };

  return (
    <div>
      {GroupIconHandler({ groups: groups_this_document_belongs_to })}
      {groups?.length == 0 ? <></> :
      <Menu anchorEl={anchorEl} onClose={handleClose} open={open}>
        {groups ? (
          groups.map((g) => {
            const _id = g._id;

            return (
              <MenuItem key={_id} value={_id} onClick={() => handleSelect(_id)}>
                <FolderIcon
                  sx={{ color: g.history[0].color }}
                  style={{ fontSize: 15, marginRight: "1em" }}
                />
                <ListItemText primary={g.history[0].label} />
              </MenuItem>
            );
          })
        ) : (
          <MenuItem>No groups added yet...</MenuItem>
        )}
      </Menu>}
    </div>
  );
}
