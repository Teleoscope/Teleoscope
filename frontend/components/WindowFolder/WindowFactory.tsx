import React, { useContext } from "react";
import Window from "@/components/WindowFolder/Window";
import WindowDefinitions from "@/components/WindowFolder/WindowDefinitions";
import { swrContext } from "@/util/swr";
import { useSelector } from "react-redux";

export default function WindowFactory(props) {
  const w = props.windata;

  const windowState = useSelector((state) => state.windows);
  const wdefs = WindowDefinitions(windowState);
  const paths = Object.entries(wdefs).reduce((obj, [w, def]) => {
    obj[w] = def.apipath;
    return obj;
  }, {})  
  
  const keymap = {
    note: "note",
    notes: "notes",
    notepalette: "notes",
    fabmenu: "fabmenu",
    group: "groups",
    grouppalette: "groups",
    document: "document",
    teleoscope: "teleoscopes",
    teleoscopes: "teleoscopes",
    teleoscopepalette: "teleoscopes",
    projection: "projections",
    projectionpalette: "projectionpalette",
    clusters: "clusters",
    search: "search",
    groups: "groups",
    operation: "operation",
    intersection: "intersection",
    ...paths
  };
  
  const type = w.type;
  const oid = w?.oid ? w.oid : w.i.split("%")[0];

  const uid = w?.uid ? w.uid : "000000"
  const id = props?.id ? props.id : `${oid}%${uid}%${type}`;

  const key = keymap[type];
  const swr = useContext(swrContext);
  const { data } = w?.demo
    ? w.demodata
    : swr.useSWRAbstract("data", `${key}/${oid}`);

  if (w.type == "FABMenu") {
    return <div>{wdefs[w.type].component(w, id, "#FFFFFF")}</div>;

  }

  return (
    <Window
      {...props}
      id={id}
      icon={wdefs[w.type].icon(data)}
      inner={wdefs[w.type].component(w, id, wdefs[w.type].color(data))}
      showWindow={wdefs[w.type].showWindow || w.showWindow}
      data={data}
      title={wdefs[w.type].title(data)}
      color={wdefs[w.type].color(data)}
      demo={w.demo}
      demodata={w.demodata}
    />
  );
}
