import React, { useState, useCallback, useContext, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/util/hooks";
import { loadBookmarkedDocuments } from "@/actions/windows";

import { setNodes, setEdges, setColor } from "@/actions/windows";

export function load_session(session_history_item) {
  const logical_clock = useAppSelector((state) => state.windows.logical_clock);
  const dispatch = useAppDispatch();
  if (session_history_item.logical_clock > logical_clock) {
    let incomingNodes = [];
    if (session_history_item.nodes) {
      incomingNodes = session_history_item.nodes;
    } else if (session_history_item.windows) {
      incomingNodes = session_history_item.windows;
    }

    let incomingEdges = [];
    if (session_history_item.edges) {
      incomingEdges = session_history_item.edges;
    }

    dispatch(
      setNodes({
        nodes: incomingNodes,
        logical_clock: session_history_item.logical_clock,
      })
    );

    dispatch(
      setEdges({
        edges: incomingEdges,
        logical_clock: session_history_item.logical_clock,
      })
    );

    dispatch(
      setColor({
        color: session_history_item.color,
      })
    );

    dispatch(loadBookmarkedDocuments(session_history_item.bookmarks));
  }
}
