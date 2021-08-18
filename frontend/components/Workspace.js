import React from "react";
import DocSet from "../components/DocSet";
import {connectRabbit} from "../components/Stomp";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { SelectableGroup } from "react-selectable-fast";
import MenuBar from "../components/MenuBar";
import { Client, Message } from '@stomp/stompjs';


const fetcher = (...args) => fetch(...args).then((res) => res.json());
function useDocSets(q) {
  const { data, error } = useSWR(
    `/api/docsets/`,
    fetcher
  );
  var ret = {
    databaseDocSets: data,
    loading: !error && !data,
    error: error,
  };
  console.log("ret", ret)

  return ret
}


export default function Workspace(props) {
  
  const [favs, setFavs] = useState({})
  const [stagedSets, setStagedSets] = useState([])
  const {databaseDocSets, loading, error} = useDocSets()
  let client

  const globalFav = (query, favlist) => {
    var temp = {...favs}
    temp[query] = favlist
    setFavs(temp)
  }

  const resolveFavs = () => {
    var merged = [].concat.apply([], Object.values(favs));
    return merged
  }

  const docsetlist = () => {
    var arr = databaseDocSets
    arr = arr.concat(stagedSets)
    if (arr.length < 1) {
      return null
    }
    return arr.map((d) => (
      <DocSet 
        docset={d}
        key={d._id}
      />
    ))
  }

  useEffect(() => {connectRabbit()})

  const handleClick = () => {
    
    var temp = [...stagedSets]
    temp.push({_id:null, label:"","queries":[]})
    setStagedSets(temp)
  }

  return (
    <div key="containerkey">
      <MenuBar 
        callback={handleClick} 
        connected={props.isConnected} 
      />
      <div id="workspace" key="workspacekey">
        {databaseDocSets ? docsetlist() : null}
      </div>
    </div>
  );
}
