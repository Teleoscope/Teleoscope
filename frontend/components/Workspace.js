import React from "react";
import { useDrop } from "react-dnd";
import useSWR, { mutate } from "swr";

import Button from "@mui/material/Button";

// dropdown TODO: move this
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

// custom components
import TopBar from "../components/TopBar";
import LeftMenuBar from "../components/LeftMenuBar";
import RightMenuBar from "../components/RightMenuBar";
import WorkspaceItem from "../components/WorkspaceItem";

// utilities
import {client_init, reorient, initialize_teleoscope} from "../components/Stomp.js";
import randomstring from "randomstring";

// actions
import { useSelector, useDispatch } from "react-redux";
import { adder } from "../actions/addtoworkspace";
import { activator } from "../actions/activeTeleoscopeID";
import { searcher } from "../actions/searchterm";


export default function Workspace(props) {
  const added = useSelector((state) => state.adder.value); // TODO rename
  const search_term = useSelector((state) => state.searchTerm.value); // TODO rename
  const teleoscope_id = useSelector((state) => state.activeTeleoscopeID.value); // TODO rename
  const dispatch = useDispatch();

  const [{ isOver }, drop] = useDrop(() => ({
    accept: "item",
    drop: (item) => dispatch(adder(item.id)),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));



  return (
    <div key="containerkey" id="containerkey">
      <TopBar/>
      <LeftMenuBar />
      <RightMenuBar/>

      <div ref={drop} id="workspace" key="workspacekey">
        {added.map((id) => {
          return <WorkspaceItem id={id} />;
        })}
      </div>
    </div>
  );
}


