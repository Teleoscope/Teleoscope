import LoadingButton from "@mui/lab/LoadingButton";
import React, { useContext, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import {
    IconButton
  } from "@mui/material";
export default function Deleter({callback, color}) {
    const [loading, setLoading] = useState(false);
    const handleDelete = () => {
      setLoading(true);
      callback()
    }
  
    if (loading) {
      return (
        <LoadingButton loading={true}></LoadingButton>
      )
    }
  
    return (
      <IconButton
        onClick={handleDelete}
      >
        <DeleteIcon
          sx={[
            {
              "&:hover": {
                color: color,
              },
            },
          ]}
        ></DeleteIcon>
      </IconButton>
    )
  } 