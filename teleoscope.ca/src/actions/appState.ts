import { createSlice } from '@reduxjs/toolkit';
import { applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { DEFAULT_STATE } from '@/lib/defaults';

const initialState = DEFAULT_STATE;

export const AppState = createSlice({
    name: 'app',
    initialState,
    reducers: {
        updateTimestamps: (state) => {
            state.workflow.last_update = new Date().toISOString();
            state.workflow.logical_clock += 1;
        },
        loadAppData: (state, action) => {
            const newState = action.payload.state;
            const currentLastUpdate = new Date(state.workflow.last_update);
            const newLastUpdate = new Date(newState.workflow.last_update);

            if (newLastUpdate > currentLastUpdate || newState.workflow.logical_clock > state.workflow.logical_clock) {
                return {
                    ...state,
                    ...newState,
                    workflow: { ...newState.workflow },
                    workspace: { ...newState.workspace },
                };
            }
        },
        relabelWorkflow: (state, action) => {
            state.workflow.label = action.payload.label;
        },
        bookmark: (state, action) => {
            const id = action.payload;
            const index = state.workflow.bookmarks.indexOf(id);
            if (index > -1) {
                state.workflow.bookmarks.splice(index, 1);
            } else {
                state.workflow.bookmarks.push(id);
            }
        },
        loadBookmarkedDocuments: (state, action) => {
            state.workflow.bookmarks = action.payload;
        },
        resetWorkspace: () => initialState,
        setColor: (state, action) => {
            state.workflow.settings.color = action.payload.color;
        },
        setSettings: (state, action) => {
            return {
                ...state,
                ...action.payload,
            };
        },
        setSelection: (state, action) => {
            state.workflow.selection = {
                nodes: action.payload.nodes || [],
                edges: action.payload.edges || []
            };
        },
        moveWindowToFront: (state, action) => {
            const index = state.workflow.nodes.findIndex((w) => w.i === action.payload);
            if (index > -1) {
                const [tempItem] = state.workflow.nodes.splice(index, 1);
                state.workflow.nodes.push(tempItem);
            }
        },
        toggleMinMax: (state, action) => {
            const index = state.workflow.nodes.findIndex((w) => w.id === action.payload.id);
            if (index > -1) {
                const node = state.workflow.nodes[index];
                const newNode = {
                    ...node,
                    width: (node.width > state.workspace.settings?.document_width || node.height > state.workspace.settings?.document_height)
                        ? state.workspace.settings?.document_width : 300,
                    height: (node.width > state.workspace.settings?.document_width || node.height > state.workspace.settings?.document_height)
                        ? state.workspace.settings?.document_height : 340,
                    style: {
                        ...node.style,
                        width: (node.width > state.workspace.settings?.document_width || node.height > state.workspace.settings?.document_height)
                            ? state.workspace.settings?.document_width : 300,
                        height: (node.width > state.workspace.settings?.document_width || node.height > state.workspace.settings?.document_height)
                            ? state.workspace.settings?.document_height : 340
                    }
                };
                state.workflow.nodes[index] = newNode;
            }
        },
        minimizeWindow: (state, action) => {
            const index = state.workflow.nodes.findIndex((w) => w.id === action.payload.id);
            if (index > -1) {
                const node = state.workflow.nodes[index];
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
        maximizeWindow: (state, action) => {
            const index = state.workflow.nodes.findIndex((w) => w.id === action.payload.id);
            if (index > -1) {
                const node = state.workflow.nodes[index];
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
        updateSearch: (state, action) => {
            const index = state.workflow.nodes.findIndex((n) => n.data.oid === action.payload.search_id);
            if (index > -1) {
                state.workflow.nodes[index].data.query = action.payload.query;
            }
        },
        checkWindow: (state, action) => {
            const index = state.workflow.nodes.findIndex((w) => w.i === action.payload.i);
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
        loadWindows: (state, action) => {
            state.workflow.nodes = action.payload;
        },
        setNodes: (state, action) => {
            state.workflow.nodes = action.payload.nodes;
        },
        setEdges: (state, action) => {
            state.workflow.edges = action.payload.edges;
        },
        updateNodes: (state, action) => {
            state.workflow.nodes = applyNodeChanges(action.payload.changes, state.workflow.nodes);
        },
        updateEdges: (state, action) => {
            state.workflow.edges = applyEdgeChanges(action.payload.changes, state.workflow.edges);
        },
        setDraggable: (state, action) => {
            const index = state.workflow.nodes.findIndex((w) => w.id === action.payload.id);
            if (index >= 0) {
                state.workflow.nodes[index].draggable = action.payload.draggable;
            }
        },
        dropNode: (state, action) => {
            state.workflow.nodes.push({
                id: action.payload.uid,
                type: action.payload.type,
                position: { x: action.payload.x, y: action.payload.y },
                positionAbsolute: { x: action.payload.x, y: action.payload.y },
                style: { width: action.payload.width, height: action.payload.height },
                data: { label: action.payload.uid, type: action.payload.type, uid: action.payload.uid },
            });
        },
        makeNode: (state, action) => {
            state.workflow.nodes.push({
                id: action.payload.uid,
                type: action.payload.type,
                position: { x: action.payload.x, y: action.payload.y },
                positionAbsolute: { x: action.payload.x, y: action.payload.y },
                style: { width: action.payload.width, height: action.payload.height },
                data: { label: action.payload.uid, type: action.payload.type, uid: action.payload.uid },
            });
        },
        makeEdge: (state, action) => {
            if (!state.workflow.edges.some((se) => action.payload.edges.some((ae) => se.id === ae.id))) {
                state.workflow.edges = [...state.workflow.edges, ...action.payload.edges];
            }
        },
        makeGroupFromBookmarks: (state, action) => {
            state.workflow.bookmarks = [];
        },
        copyDoclistsToGroups: (state, action) => {
            // Add any state changes here
        },
        updateNode: (state, action) => {
            // Add any state changes here
        },
        removeCluster: (state, action) => {
            // Add any state changes here
        },
        initializeProjection: (state, action) => {
            // Add any state changes here
        },
        relabelProjection: (state, action) => {
            // Add any state changes here
        },
        removeProjection: (state, action) => {
            // Add any state changes here
        },
        removeWorkflow: (state, action) => {
            // Add any state changes here
        },
        initializeWorkflow: (state, action) => {
            // Add any state changes here
        },
        addGroup: (state, action) => {
            // Add any state changes here
        },
        removeGroup: (state, action) => {
            // Add any state changes here
        },
        recolorGroup: (state, action) => {
            // Add any state changes here
        },
        relabelGroup: (state, action) => {
            // Add any state changes here
        },
        mark: (state, action) => {
            // Add any state changes here
        },
        removeDocumentFromGroup: (state, action) => {
            // Add any state changes here
        },
        addDocumentToGroup: (state, action) => {
            // Add any state changes here
        },
        copyCluster: (state, action) => {
            // Add any state changes here
        },
        clusterByGroups: (state, action) => {
            // Add any state changes here
        },
        saveUIState: (state, action) => {
            // Add any state changes here
        },
        updateNote: (state, action) => {
            // Add any state changes here
        },
        addNote: (state, action) => {
            // Add any state changes here
        },
        relabelNote: (state, action) => {
            // Add any state changes here
        },
        removeNote: (state, action) => {
            // Add any state changes here
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
    setSettings,
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
    dropNode
} = AppState.actions;

export default AppState.reducer;
