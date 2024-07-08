
import { Workflows } from "@/types/workflows";
import type { Workspaces } from "@/types/workspaces";
// import { ObjectId } from "bson";

export const DEFAULT_GREY = '#D3D3D3';
export const DEFAULT_DRAWER_WIDTH = 200;
export const DEFAULT_MIN_WIDTH = 34;
export const DEFAULT_TITLE_LENGTH = 40;

export const DEFAULT_TEAM_NAME = "Default team";

export const DEFAULT_WORKSPACE: Workspaces = {
    label: "Workspace loading...",
    team: undefined,
    workflows: [],
    settings: {
        document_height: 35,
        document_width: 100,
        expanded: false
    }
}

export const DEFAULT_WORKFLOW: Workflows = {
    label: "Worflow loading...",
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
    }
}

export const DEFAULT_STATE = {
    workflow: DEFAULT_WORKFLOW,
    workspace: DEFAULT_WORKSPACE
  };