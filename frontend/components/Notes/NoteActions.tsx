import Tooltip from "@mui/material/Tooltip";

import IconButton from "@mui/material/IconButton";

import { BsFiletypeDocx } from "react-icons/bs";

export const SaveNote = (props) => {
  return (
    <Tooltip title="Save Note" key="Save Note">
      <IconButton onClick={() => props.save()}>
        <BsFiletypeDocx fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};




