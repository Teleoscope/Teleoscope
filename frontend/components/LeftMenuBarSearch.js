import React, { useState } from "react";

// MUI imports
import TextField from "@material-ui/core/TextField";

// actions
import { useSelector, useDispatch } from "react-redux";
import { searcher } from "../actions/searchterm";

export default function LeftMenuBarSearch() {

   const [text, setText] = useState("");
   const dispatch = useDispatch();

   const keyChange = (e) => {
      if (e.code == "Enter") {
        dispatch(searcher(text));
      }
    };

   return (
      <TextField
      variant="filled"
      label="Search posts..."
      placeholder="Add query..."
      onKeyDown={(e) => keyChange(e)}
      onChange={(e) => setText(e.target.value)}
      style={{ width: "100%", borderRadius: "0 !important" }}
    />
   )
}