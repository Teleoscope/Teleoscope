import { configureStore } from '@reduxjs/toolkit';
import appState, {
    removeWindow,
    updateEdges,
    updateNodes,
    updateSearch,
    makeGroupFromBookmarks,
    initializeProjection,
    removeCluster,
    relabelProjection,
    removeWorkflow,
    addGroup,
    removeGroup,
    recolorGroup,
    relabelGroup,
    mark,
    removeDocumentFromGroup,
    addDocumentToGroup,
    copyCluster,
    saveUIState,
    updateNote,
    addNote,
    relabelNote,
    removeNote,
    initializeWorkflow
} from '@/actions/appState';
import {
    makeNode,
    makeEdge,
    setColor,
    relabelWorkflow
} from '@/actions/appState';
import crypto from 'crypto';
import post from '@/lib/client';
// Or from '@reduxjs/toolkit/query/react'
import { setupListeners } from '@reduxjs/toolkit/query';
import {
    copyDoclistsToGroups,
    initializeTeleoscope,
    relabelTeleoscope,
    removeTeleoscope,
    updateNode
} from '../actions/appState';
import { appApi } from '@/services/app';

const headers = (state) => ({
    replyTo: state.activeSessionID.replyToQueue,
    database: state.activeSessionID.database,
    userid: state.activeSessionID.userid,
    workflow_id: state.appState.workflow._id,
    workspace_id: state.appState.workspace._id
});

const handleMakeNode = (store, action, next) => {
    const uid = crypto.randomBytes(8).toString('hex');
    const modifiedPayload = { ...action.payload, uid };
    const modifiedAction = { ...action, payload: modifiedPayload };
    const result = next(modifiedAction);
    const updatedState = store.getState();

    post({
        task: 'add_item',
        args: {
            ...headers(updatedState),
            oid: modifiedPayload.oid,
            uid: modifiedPayload.uid,
            node_type: modifiedPayload.type,
            options: { index: modifiedPayload.index },
            state: updatedState
        }
    });

    return result;
};

const handleMakeEdge = (store, action, next) => {
    const result = next(action);
    const updatedState = store.getState();
    const nodes = updatedstate.appState.workflow.nodes.nodes;
    const sourceNode = nodes.find(
        (n) => n.id === action.payload.connection.source
    );
    const targetNode = nodes.find(
        (n) => n.id === action.payload.connection.target
    );
    const handleType = action.payload.connection.targetHandle
        .split('_')
        .slice(-1)[0];

    post({
        task: 'make_edge',
        args: {
            ...headers(updatedState),
            session_id: updatedState.activeSessionID.value,
            source_node: sourceNode,
            target_node: targetNode,
            edge_type: handleType,
            connection: action.payload.connection,
            ui_state: updatedState
        }
    });

    return result;
};

const actionMiddleware = (store) => (next) => (action) => {
    switch (action.type) {
        case makeNode.type:
            return handleMakeNode(store, action, next);
        case makeEdge.type:
            return handleMakeEdge(store, action, next);
        case removeWindow.type:
            const nodeId = action.payload.node;
            const state = store.getState();
            const edges = state.appState.workflow.edges.filter(
                (e) => e.target.includes(nodeId) || e.source.includes(nodeId)
            );

            edges.forEach((edge) => {
                store.dispatch(
                    updateEdges({ changes: [{ id: edge.id, type: 'remove' }] })
                );
            });
            break;
        case updateNodes.type:
            const result = next(action);
            const changes = action.payload.changes;
            changes.forEach((change) => {
                if (change.type === 'remove') {
                    const state = store.getState();
                    const edges = state.appState.workflow.edges.filter(
                        (e) => e.target === change.id || e.source === change.id
                    );
                    edges.forEach((edge) => {
                        store.dispatch(
                            updateEdges({
                                changes: [{ id: edge.id, type: 'remove' }]
                            })
                        );
                    });
                }
            });
            return result;
        case updateEdges.type:
            const edgeChanges = action.payload.changes;
            edgeChanges.forEach((change) => {
                if (change.type === 'remove') {
                    const state = store.getState();
                    const edges = state.appState.workflow.edges;
                    const edge = edges.find((e) => e.id === change.id);

                    post({
                        task: 'remove_edge',
                        args: {
                            ...headers(store.getState()),
                            edge
                        }
                    });
                }
            });
            break;
        default:
            const callPost = (taskName) =>
                post({
                    task: taskName,
                    args: {
                        ...headers(store.getState()),
                        ...action.payload
                    }
                });

            switch (action.type) {
                case initializeWorkflow.type:
                    callPost('initialize_workflow');
                    break;
                case setColor.type:
                    callPost('recolor_workflow');
                    break;
                case relabelWorkflow.type:
                    callPost('relabel_workflow');
                    break;
                case updateSearch.type:
                    callPost('update_search');
                    break;
                case makeGroupFromBookmarks.type:
                    callPost('add_group');
                    break;
                case copyDoclistsToGroups.type:
                    callPost('copy_doclists_to_groups');
                    break;
                case updateNode.type:
                    callPost('update_node');
                    break;
                case initializeTeleoscope.type:
                    callPost('initialize_teleoscope');
                    break;
                case removeTeleoscope.type:
                    callPost('remove_teleoscope');
                    break;
                case relabelTeleoscope.type:
                    callPost('relabel_teleoscope');
                    break;
                case removeCluster.type:
                    callPost('remove_cluster');
                    break;
                case initializeProjection.type:
                    callPost('initialize_projection');
                    break;
                case relabelProjection.type:
                    callPost('relabel_projection');
                    break;
                case removeWorkflow.type:
                    callPost('remove_workflow');
                    break;
                case addGroup.type:
                    callPost('add_group');
                    break;
                case removeGroup.type:
                    callPost('remove_group');
                    break;
                case recolorGroup.type:
                    callPost('recolor_group');
                    break;
                case relabelGroup.type:
                    callPost('relabel_group');
                    break;
                case mark.type:
                    callPost('mark');
                    break;
                case removeDocumentFromGroup.type:
                    callPost('remove_document_from_group');
                    break;
                case addDocumentToGroup.type:
                    callPost('add_document_to_group');
                    break;
                case copyCluster.type:
                    callPost('copy_cluster');
                    break;
                case saveUIState.type:
                    callPost('save_UI_state');
                    break;
                case updateNote.type:
                    callPost('update_note');
                    break;
                case addNote.type:
                    callPost('add_note');
                    break;
                case relabelNote.type:
                    callPost('relabel_note');
                    break;
                case removeNote.type:
                    callPost('remove_note');
                    break;
                default:
                    break;
            }
    }

    return next(action);
};

export const store = configureStore({
    reducer: {
        // Add the generated reducer as a specific top-level slice
        [appApi.reducerPath]: appApi.reducer,
        appState: appState
    },
    // Adding the api middleware enables caching, invalidation, polling,
    // and other useful features of `rtk-query`.
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            .concat(appApi.middleware)
});

// optional, but required for refetchOnFocus/refetchOnReconnect behaviors
// see `setupListeners` docs - takes an optional callback as the 2nd arg for customization
setupListeners(store.dispatch);
// export const makeStore = (preloadedState) => configureStore({
//   reducer: {
//     activeSessionID: ActiveSessionID,
//     windows: Windows,
//   },
//   preloadedState,
//   middleware: (getDefaultMiddleware) =>
//     getDefaultMiddleware({
//       serializableCheck: {
//         ignoredActions: ["your/action/type"],
//         ignoredActionPaths: ["payload.client"],
//         ignoredPaths: ["items.dates"],
//       },
//     }).concat(actionMiddleware),
// });

export const makeStore = () => {
    return store;
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
