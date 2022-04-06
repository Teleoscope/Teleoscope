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
import LeftMenuBar from "../components/LeftMenuBar";
import RightMenuBar from "../components/RightMenuBar";
import WorkspaceItem from "../components/WorkspaceItem";

// utilities
import {client_init, reorient, initialize_teleoscope} from "../components/Stomp.js";
import randomstring from "randomstring";

// actions
import { useSelector, useDispatch } from "react-redux";
import { adder } from "../actions/addtoworkspace";

const fetcher = (...args) => fetch(...args).then((res) => res.json());
function useTeleoscopes() {
  const { data, error } = useSWR(`/api/teleoscopes/`, fetcher);
  return {
    teleoscopes: data,
    loading: !error && !data,
    error: error,
  };
}

export default function Workspace(props) {
  const client = client_init();
  const [teleoscope_id, setTeleoscope_id] = React.useState(-1);
  
  const { teleoscopes, loading, error } = useTeleoscopes();

  const added = useSelector((state) => state.adder.value); // TODO rename
  const search_term = useSelector((state) => state.searcher.value); // TODO rename
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
      <LeftMenuBar />
      <RightMenuBar teleoscope_id={teleoscope_id} />

      <div>Active teleoscope_id is {teleoscope_id}
      <hr/>
      {teleoscopes ? teleoscopes.map((t) => {
        return( <p><Button onClick={() => setTeleoscope_id(t["teleoscope_id"])}>
          <span>{t["query"]}</span> : <span>{t["teleoscope_id"]}</span></Button></p>
          )
      }):[]}
      </div>
      <Button variant="text" onClick={() => initialize_teleoscope(client, search_term, teleoscope_id, added, [])}>
        New Teleoscope
      </Button>
      <Button variant="text" onClick={() => reorient(client, search_term)}>
        Reorient
      </Button>


      <div ref={drop} id="workspace" key="workspacekey">
        {added.map((id) => {
          return <WorkspaceItem id={id} />;
        })}
      </div>
    </div>
  );
}


