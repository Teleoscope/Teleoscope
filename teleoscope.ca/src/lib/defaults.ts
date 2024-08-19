
import { Workflows } from "@/types/workflows";
import type { Workspaces } from "@/types/workspaces";
// import { ObjectId } from "mongodb";
// import { ObjectId } from "bson";

class ObjectId {}

export const DEFAULT_GREY = '#D3D3D3';
export const DEFAULT_DRAWER_WIDTH = 100;
export const DEFAULT_MIN_WIDTH = 15;
export const DEFAULT_TITLE_LENGTH = 40;

export const DEFAULT_WORKSPACE: Workspaces = {
    label: "Workspace loading...",
    team: null,
    workflows: [],
    settings: {
        document_height: 35,
        document_width: 100,
        expanded: false
    }
}

export const DEFAULT_WORKFLOW: Workflows = {
    _id: null,
    label: "Workflow loading...",
    nodes: [],
    edges: [],
    bookmarks: [],
    selection: {
        nodes: [],
        edges: []
    },
    settings: {
        color: DEFAULT_GREY,
        title_length: 50
    },
    last_update: new Date('December 17, 1995 03:24:00').toISOString(),
    logical_clock: 0,
    workspace: null
}

export const DEFAULT_STATE = {
    workflow: DEFAULT_WORKFLOW,
    workspace: DEFAULT_WORKSPACE
  };