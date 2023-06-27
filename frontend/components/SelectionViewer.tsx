import React, { useState } from "react";

import { useAppSelector, useAppDispatch } from "@/util/hooks";
import DocViewer from "@/components/DocViewer";
import GroupViewer from "@/components/GroupViewer";
import NotesViewer from "@/components/NotesViewer";
import TeleoscopeViewer from "@/components/TeleoscopeViewer";
import ClusterViewer from "@/components/Cluster/ClusterViewer";

export default function SelectionViewer(props) {
  const selection = useAppSelector((state) => state.windows.selection);
  return (
    <div>
      {selection.nodes.map((node) => {
        if (node.data.type == "Document") {
          return (
            <DocViewer
              compact={true}
              windata={node.data}
              key={node.id.split("%")[0]}
              id={node.id.split("%")[0]}
            ></DocViewer>
          );
        }
        if (node.data.type == "Group" && !props.noGroup) {
          return (
            <GroupViewer
              compact={true}
              key={node.id.split("%")[0]}
              id={node.id.split("%")[0]}
            ></GroupViewer>
          );
        }
        if (node.data.type == "Cluster" && !props.noGroup) {
          return (
            <ClusterViewer
              compact={true}
              key={node.id.split("%")[0]}
              id={node.id.split("%")[0]}
            ></ClusterViewer>
          );
        }
        if (node.data.type == "Note") {
          return (
            <NotesViewer
              compact={true}
              key={node.id.split("%")[0]}
              id={node.id.split("%")[0]}
            ></NotesViewer>
          );
        }

        if (node.data.type == "Teleoscope" && !props.noGroup) {
          return (
            <TeleoscopeViewer
              compact={true}
              key={node.id.split("%")[0]}
              id={node.id.split("%")[0]}
            ></TeleoscopeViewer>
          );
        }
      })}
    </div>
  );
}
