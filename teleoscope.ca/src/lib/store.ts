import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import crypto from 'crypto';
import post from '@/lib/client';
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
    initializeWorkflow,
    makeNode,
    makeEdge,
    setColor,
    relabelWorkflow,
    removeProjection
} from '@/actions/appState';
import { copyDoclistsToGroups, updateNode } from '../actions/appState';
import { appApi, AppState } from '@/services/app';
import axios from 'axios';

const headers = (state) => {
    return {
        workflow_id: state.appState.workflow._id,
        workspace_id: state.appState.workspace._id
    };
};

// Custom middleware function for actions
const actionMiddleware = (store) => (next) => (action) => {
    if (action.type === makeNode.type) {
        const uid = crypto.randomBytes(8).toString('hex');

        // Perform any necessary modifications to the action payload
        const modifiedPayload = {
            ...action.payload,
            uid: uid
        };

        // Create a new action object with the modified payload
        const modifiedAction = {
            ...action,
            payload: modifiedPayload
        };

        // Call the next middleware or the reducer with the modified action
        const result = next(modifiedAction);

        // Perform the action or side effect you want to do after the store update
        const { appState } : { appState: AppState } = store.getState();

        const post_result = axios.post(`/api/workflow`, 
            appState.workflow
        )

        // post({
        //     task: 'add_item',
        //     args: {
        //         ...headers(updatedState),

        //         oid: modifiedAction.payload.oid,
        //         uid: modifiedAction.payload.uid,
        //         node_type: modifiedAction.payload.type,
        //         options: { index: modifiedAction.payload.index },
        //         state: updatedState.appState
        //     }
        // });

        return result;
    }

    if (action.type === makeEdge.type) {
        // Call the next middleware or the reducer with the modified action
        const result = next(action);

        // Perform the action or side effect you want to do after the store update
        const { appState } : { appState: AppState } = store.getState();
        const post_result = axios.post(`/api/workflow`, 
            appState.workflow
        )

        const nodes = appState.workflow.nodes;
        const source_node = nodes.find(
            (n) => n.id === action.payload.connection.source
        );
        const target_node = nodes.find(
            (n) => n.id === action.payload.connection.target
        );
        const handle_type = action.payload.connection.targetHandle
            .split('_')
            .slice(-1)[0];

        // post({
        //     task: 'make_edge',
        //     args: {
        //         ...headers(appState),

        //         session_id: appState.workflow._id,
        //         source_node: source_node,
        //         target_node: target_node,
        //         edge_type: handle_type,
        //         connection: action.payload.connection,
        //         ui_state: appState
        //     }
        // });


        return result;
    }

    if (action.type === removeWindow.type) {
        const node_id = action.payload.node;
        const { appState } : { appState: AppState } = store.getState();
        const edges = appState.workflow.edges.filter(
            (e) => e.target.includes(node_id) || e.source.includes(node_id)
        );

        edges.forEach((edge) => {
            store.dispatch(
                updateEdges({
                    changes: [
                        {
                            id: edge.id,
                            type: 'remove'
                        }
                    ]
                })
            );
        });
    }

    if (action.type === updateNodes.type) {
        // Call the next middleware or the reducer with the modified action
        const result = next(action);

        // Perform the action or side effect you want to do after the store update
        const { appState } : { appState: AppState } = store.getState();
        const post_result = axios.post(`/api/workflow`, 
            appState.workflow
        )
        
        const changes = action.payload.changes;
        changes.forEach((change) => {
            if (change.type == 'remove') {
                const { appState } : { appState: AppState } = store.getState();
                const edges = appState.workflow.edges.filter(
                    (e) => e.target == change.id || e.source == change.id
                );
                edges.forEach((edge) => {
                    store.dispatch(
                        updateEdges({
                            changes: [
                                {
                                    id: edge.id,
                                    type: 'remove'
                                }
                            ]
                        })
                    );
                });
            }
        });
        return result;
    }

    if (action.type === updateEdges.type) {
        const changes = action.payload.changes;
        changes.forEach((change) => {
            if (change.type == 'remove') {
                const { appState } : { appState: AppState } = store.getState();
                const edges = appState.workflow.edges;
                const edge = edges.find((e) => e.id == change.id);

                post({
                    task: 'remove_edge',
                    args: {
                        ...headers(store.getState()),
                        edge: edge
                    }
                });
            }
        });
    }

    const callPost = (task_name) =>
        post({
            task: task_name,
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
        case removeCluster.type:
            callPost('remove_cluster');
            break;
        case initializeProjection.type:
            callPost('initialize_projection');
            break;
        case relabelProjection.type:
            callPost('relabel_projection');
            break;
        case removeProjection.type:
            callPost('remove_projection');
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
    }

    // Call the next middleware or the reducer
    const result = next(action);
    return result;
};

export const store = configureStore({
    reducer: {
        [appApi.reducerPath]: appApi.reducer,
        appState: appState
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            .concat(appApi.middleware)
            .concat(actionMiddleware)
});

setupListeners(store.dispatch);

export const makeStore = () => store;

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
