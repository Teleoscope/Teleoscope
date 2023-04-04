import React from "react";

// custom components
import TopBar from "./WindowModules/TopBar";
import ContextMenu from "./Context/ContextMenu";
import Flow from "./Flow";

export default function Workspace(props) {
  return (
    <div style={{ cursor: "context-menu" }}>
      <div style={{ width: "100vw", height: "10vh" }}>
        <TopBar isConnected={props.isConnected} />
      </div>
      <Flow></Flow>
    </div>
  );
}
