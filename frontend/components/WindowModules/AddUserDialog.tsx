import React from "react";

import { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { Box } from "@mui/material";
import { FormControl } from '@mui/material';
import { FormHelperText } from "@mui/material";
import { InputLabel } from '@mui/material';
import { Select } from '@mui/material';
import { Button } from "@mui/material";

export default function AddUserDialogue(props) {
    return (
      <Dialog disableEscapeKeyDown open={props.open} onClose={props.handleClose}>
        <DialogTitle>Collaborate with User</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ display: 'flex', flexWrap: 'wrap' }}>
            <FormControl
              sx={{ width: 200, backgroundColor: 'white', }}
              variant="filled"
            >
              <InputLabel id="demo-simple-select-helper-label">User</InputLabel>
              <Select
                  labelId="demo-simple-select-helper-label"
                  id="demo-simple-select-helper"
                  value={props.dialogValue.label}
                  label="User"
                  onChange={(event) => props.setDialogValue({label: event.target.value})}
              >
                {props.users}
              </Select>
              <FormHelperText>Select User</FormHelperText>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => props.onClose()}>Cancel</Button>
          <Button
            type="submit"
            onClick={() => {
              props.client.add_user_to_session(props.dialogValue.label._id, props.session_id);
              props.onClose()
            }}
          >Add
          </Button>
        </DialogActions>
      </Dialog>
    )
  }