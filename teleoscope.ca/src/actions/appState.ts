import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { applyNodeChanges, applyEdgeChanges, Edge, Node } from 'reactflow';
import { DEFAULT_STATE } from '@/lib/defaults';
import { Workflows } from '@/types/workflows';
import { Workspaces } from '@/types/workspaces';

interface AppStateType {
    workflow: Workflows;
    workspace: Workspaces;
}

const initialState: AppStateType = DEFAULT_STATE;

export const AppState = createSlice({
    name: 'app',
    initialState: initialState,
    reducers: {
        updateTimestamps: (state) => {
            state.workflow.last_update = new Date().toISOString();
            state.workflow.logical_clock += 1;
        },
        resetTimestamps: (state) => {
            state.workflow.logical_clock = 0;
        },
        loadAppData: (
            state: AppStateType,
            action: PayloadAction<{ state: AppStateType }>
        ) => {
            const newState = action.payload.state;
            const currentLastUpdate = new Date(state.workflow.last_update);
            const newLastUpdate = new Date(newState.workflow.last_update);

            if (
                newLastUpdate > currentLastUpdate ||
                newState.workflow.logical_clock > state.workflow.logical_clock
            ) {
                return {
                    ...state,
                    ...newState,
                    workflow: { ...newState.workflow },
                    workspace: { ...newState.workspace }
                };
            }
        },
        saveNote: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        loadState: (state: AppStateType, action: PayloadAction<{ state: AppStateType }>) => {
            return action.payload.state;
        },
        relabelWorkflow: (state: AppStateType, action: PayloadAction<{ label: string }>) => {
            state.workflow.label = action.payload.label;
        },
        bookmark: (state: AppStateType, action: PayloadAction<string>) => {
            const id = action.payload;
            const index = state.workflow.bookmarks.indexOf(id);
            if (index > -1) {
                state.workflow.bookmarks.splice(index, 1);
            } else {
                state.workflow.bookmarks.push(id);
            }
        },
        loadBookmarkedDocuments: (state: AppStateType, action: PayloadAction<string[]>) => {
            state.workflow.bookmarks = action.payload;
        },
        resetWorkspace: () => initialState,
        setColor: (state: AppStateType, action: PayloadAction<{ color: string }>) => {
            state.workflow.settings.color = action.payload.color;
        },
        setWorkflowSettings: (
            state: AppStateType,
            action: PayloadAction<{ setting: string; value: any }>
        ) => {
            state.workflow.settings[action.payload.setting] =
                action.payload.value;
        },
        setWorkspaceSettings: (
            state: AppStateType,
            action: PayloadAction<{ setting: string; value: any }>
        ) => {
            state.workspace.settings[action.payload.setting] =
                action.payload.value;
        },
        setSelection: (
            state: AppStateType,
            action: PayloadAction<{ nodes: string[]; edges: string[] }>
        ) => {
            state.workflow.selection = {
                nodes: action.payload.nodes || [],
                edges: action.payload.edges || []
            };
        },
        moveWindowToFront: (state: AppStateType, action: PayloadAction<string>) => {
            const index = state.workflow.nodes.findIndex(
                (w) => w.id === action.payload
            );
            if (index > -1) {
                const [tempItem] = state.workflow.nodes.splice(index, 1);
                state.workflow.nodes.push(tempItem);
            }
        },
        toggleMinMax: (state: AppStateType, action: PayloadAction<{ id: string }>) => {
            const index = state.workflow.nodes.findIndex(
                (w) => w.id === action.payload.id
            );
            if (index > -1) {
                const node: Node = state.workflow.nodes[index];
                const newNode = {
                    ...node,
                    width:
                        node.width > state.workspace.settings.document_width ||
                        node.height > state.workspace.settings.document_height
                            ? state.workspace.settings?.document_width
                            : 300,
                    height:
                        node.width > state.workspace.settings.document_width ||
                        node.height > state.workspace.settings.document_height
                            ? state.workspace.settings?.document_height
                            : 340,
                    style: {
                        ...node.style,
                        width:
                            node.width >
                                state.workspace.settings.document_width ||
                            node.height >
                                state.workspace.settings.document_height
                                ? state.workspace.settings.document_width
                                : 300,
                        height:
                            node.width >
                                state.workspace.settings.document_width ||
                            node.height >
                                state.workspace.settings.document_height
                                ? state.workspace.settings?.document_height
                                : 340
                    }
                };
                state.workflow.nodes[index] = newNode;
            }
        },
        minimizeWindow: (state: AppStateType, action: PayloadAction<{ id: string }>) => {
            const index = state.workflow.nodes.findIndex(
                (w) => w.id === action.payload.id
            );
            if (index > -1) {
                const node: Node = state.workflow.nodes[index];
                const newNode = {
                    ...node,
                    width: state.workspace.settings?.document_width,
                    height: state.workspace.settings?.document_height,
                    style: {
                        ...node.style,
                        width: state.workspace.settings?.document_width,
                        height: state.workspace.settings?.document_height
                    }
                };
                state.workflow.nodes[index] = newNode;
            }
        },
        maximizeWindow: (state: AppStateType, action: PayloadAction<{ id: string }>) => {
            const index = state.workflow.nodes.findIndex(
                (w) => w.id === action.payload.id
            );
            if (index > -1) {
                const node: Node = state.workflow.nodes[index];
                const newNode = {
                    ...node,
                    width: 400,
                    height: 450,
                    style: {
                        ...node.style,
                        width: 400,
                        height: 450
                    }
                };
                state.workflow.nodes[index] = newNode;
            }
        },
        setRefreshInterval: (state: AppStateType, action: PayloadAction<{ uid: string, refreshInterval: number }>) => {
            console.log("Setting refreshInterval", action.payload )
            const index = state.workflow.nodes.findIndex(
                (w) => w.id === action.payload.uid
            );
            if (index > -1) {
                const node: Node = state.workflow.nodes[index];
                const newNode = {
                    ...node,
                    data: {
                        ...node.data,
                        refreshInterval: action.payload.refreshInterval,
                        refreshing: true
                    }
                };
                state.workflow.nodes[index] = newNode;
            }
        },
        cancelRefreshInterval: (state, action: PayloadAction<{uid: string}>) => {
            const index = state.workflow.nodes.findIndex(
                (w) => w.id === action.payload.uid
            );
            if (index > -1) {
                const node: Node = state.workflow.nodes[index];
                const newNode = {
                    ...node,
                    data: {
                        ...node.data,
                        refreshInterval: 0,
                        refreshing: false
                    }
                };
                state.workflow.nodes[index] = newNode;
            }
        },
        updateSearch: (
            state: AppStateType,
            action: PayloadAction<{ search_id: string; query: string }>
        ) => {
            const index = state.workflow.nodes.findIndex(
                (n) => n.data.uid === action.payload.search_id
            );
            if (index > -1) {
                state.workflow.nodes[index].data.query = action.payload.query;
            }
        },
        checkWindow: (
            state: AppStateType,
            action: PayloadAction<{ i: string; check: boolean }>
        ) => {
            const index = state.workflow.nodes.findIndex(
                (w) => w.id === action.payload.i
            );
            if (index > 0) {
                state.workflow.nodes[index].isChecked = action.payload.check;
            }
        },
        deselectAll: (state) => {
            state.workflow.nodes.forEach((w) => {
                w.isChecked = false;
            });
        },
        selectAll: (state) => {
            state.workflow.nodes.forEach((w) => {
                if (w.type === 'Document') {
                    w.isChecked = true;
                }
            });
        },
        loadWindows: (state: AppStateType, action: PayloadAction<Node[]>) => {
            state.workflow.nodes = action.payload;
        },
        setNodes: (state: AppStateType, action: PayloadAction<{ nodes: Node[] }>) => {
            state.workflow.nodes = action.payload.nodes;
        },
        setEdges: (state: AppStateType, action: PayloadAction<{ edges: Edge[] }>) => {
            state.workflow.edges = action.payload.edges;
        },
        updateNodes: (state: AppStateType, action: PayloadAction<{ changes: any }>) => {
            state.workflow.nodes = applyNodeChanges(
                action.payload.changes,
                state.workflow.nodes
            );
        },
        updateEdges: (state: AppStateType, action: PayloadAction<{ changes: any }>) => {
            state.workflow.edges = applyEdgeChanges(
                action.payload.changes,
                state.workflow.edges
            );
        },
        setDraggable: (
            state: AppStateType,
            action: PayloadAction<{ id: string; draggable: boolean }>
        ) => {
            const index = state.workflow.nodes.findIndex(
                (w) => w.id === action.payload.id
            );
            if (index >= 0) {
                state.workflow.nodes[index].draggable =
                    action.payload.draggable;
            }
        },
        dropNode: (
            state: AppStateType,
            action: PayloadAction<{
                oid: string;
                uid: string;
                type: string;
                x: number;
                y: number;
                width: number;
                height: number;
            }>
        ) => {
            state.workflow.nodes.push({
                id: action.payload.uid,
                type: action.payload.type,
                position: { x: action.payload.x, y: action.payload.y },
                positionAbsolute: { x: action.payload.x, y: action.payload.y },
                style: {
                    width: action.payload.width,
                    height: action.payload.height
                },
                data: {
                    label: action.payload.uid,
                    type: action.payload.type,
                    uid: action.payload.uid
                }
            });
        },
        makeNode: (
            state: AppStateType,
            action: PayloadAction<{
                uid: string;
                type: string;
                x: number;
                y: number;
                width: number;
                height: number;
            }>
        ) => {
            state.workflow.nodes.push({
                id: action.payload.uid,
                type: action.payload.type,
                position: { x: action.payload.x, y: action.payload.y },
                positionAbsolute: { x: action.payload.x, y: action.payload.y },
                style: {
                    width: action.payload.width,
                    height: action.payload.height
                },
                data: {
                    label: action.payload.uid,
                    type: action.payload.type,
                    uid: action.payload.uid
                }
            });
        },
        makeEdge: (state: AppStateType, action: PayloadAction<{ uid: string, edges: Edge[] }>) => {
            if (
                !state.workflow.edges.some((se) =>
                    action.payload.edges.some((ae) => se.id === ae.id)
                )
            ) {
                state.workflow.edges = [
                    ...state.workflow.edges,
                    ...action.payload.edges
                ];
            }
        },
        loadWorkflow: (
            state: AppStateType,
            action: PayloadAction<{ workflow_id: string, workspace_id: string }>
        ) => {
            state.workspace.selected_workflow = action.payload.workflow_id;
        },
        makeGroupFromBookmarks: (state) => {
            state.workflow.bookmarks = [];
        },
        updateNode: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        copyDoclistsToGroups: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        removeCluster: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        initializeProjection: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        relabelProjection: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        removeProjection: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        removeWorkflow: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        initializeWorkflow: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        addGroup: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        removeGroup: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        recolorGroup: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        relabelGroup: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        mark: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        removeDocumentFromGroup: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        addDocumentToGroup: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        copyCluster: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        clusterByGroups: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        saveUIState: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        updateNote: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        addNote: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        relabelNote: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        },
        removeNote: (state: AppStateType, action: PayloadAction<any>) => {
            // Implement the action
        }
    }
});

export const {
    relabelWorkflow,
    bookmark,
    loadBookmarkedDocuments,
    setColor,
    resetWorkspace,
    setSelection,
    setWorkspaceSettings,
    setWorkflowSettings,
    makeNode,
    setDraggable,
    updateNodes,
    setEdges,
    makeEdge,
    updateEdges,
    setNodes,
    loadWindows,
    updateSearch,
    minimizeWindow,
    maximizeWindow,
    checkWindow,
    selectAll,
    deselectAll,
    moveWindowToFront,
    toggleMinMax,
    makeGroupFromBookmarks,
    copyDoclistsToGroups,
    updateNode,
    removeCluster,
    initializeProjection,
    relabelProjection,
    removeProjection,
    removeWorkflow,
    initializeWorkflow,
    addGroup,
    removeGroup,
    recolorGroup,
    relabelGroup,
    mark,
    removeDocumentFromGroup,
    addDocumentToGroup,
    copyCluster,
    clusterByGroups,
    saveUIState,
    updateNote,
    addNote,
    relabelNote,
    removeNote,
    loadAppData,
    updateTimestamps,
    resetTimestamps,
    dropNode,
    loadWorkflow,
    loadState,
    saveNote,
    setRefreshInterval,
    cancelRefreshInterval
} = AppState.actions;

export default AppState.reducer;
