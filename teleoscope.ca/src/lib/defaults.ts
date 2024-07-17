
import { Workflows } from "@/types/workflows";
import type { Workspaces } from "@/types/workspaces";
// import { ObjectId } from "mongodb";
// import { ObjectId } from "bson";

class ObjectId {}

export const DEFAULT_GREY = '#D3D3D3';
export const DEFAULT_DRAWER_WIDTH = 200;
export const DEFAULT_MIN_WIDTH = 34;
export const DEFAULT_TITLE_LENGTH = 40;

export const DEFAULT_TEAM_NAME = "Team loading...";

export const DEFAULT_WORKSPACE: Workspaces = {
    label: "Workspace loading...",
    team: "Team loading...",
    workflows: [],
    settings: {
        document_height: 35,
        document_width: 100,
        expanded: false
    }
}

export const DEFAULT_WORKFLOW: Workflows = {
    _id: "Workflow loading...",
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
    workspace: "Workspace loading..."
}

export const DEFAULT_STATE = {
    workflow: DEFAULT_WORKFLOW,
    workspace: DEFAULT_WORKSPACE
  };