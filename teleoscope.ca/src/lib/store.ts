import { configureStore } from '@reduxjs/toolkit';
import crypto from 'crypto';
import post from '@/lib/client';
import appState, {
    updateEdges,
    updateNodes,
    updateSearch,
    makeGroupFromBookmarks,
    initializeProjection,
    removeCluster,
    relabelProjection,
    removeWorkflow,
    addGroup,
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
    removeProjection,
    updateTimestamps,
    loadAppData,
    dropNode,
    removeGroup,
} from '@/actions/appState';
import { copyDoclistsToGroups, updateNode } from '../actions/appState';
import axios from 'axios';
import {
    Edge,
    EdgeAddChange,
    EdgeChange,
    EdgeRemoveChange,
    NodeChange,
    NodeRemoveChange
} from 'reactflow';
import { Workflows } from '@/types/workflows';
import { Workspaces } from '@/types/workspaces';

interface AppState {
    workflow: Workflows,
    workspace: Workspaces
}

const headers = (appState: AppState) => {
    return {
        workflow_id: appState.workflow._id,
        workspace_id: appState.workspace._id
    };
};

// Custom middleware function for actions
const actionMiddleware = (store) => (next) => (action) => {
    // Dispatch the updateTimestamp action
    if (
        action.type !== updateTimestamps.type &&
        action.type !== loadAppData.type
    ) {
        const { appState }: { appState: AppState } = store.getState();
        console.log(action.type, action.payload, appState.workflow.logical_clock, appState)
        store.dispatch(updateTimestamps());
    } else {
        const { appState }: { appState: AppState } = store.getState();
        console.log(action.type, action.payload, appState.workflow.logical_clock, appState)
    }


    if (action.type === dropNode.type) {
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
        const { appState }: { appState: AppState } = store.getState();

        const post_workflow = axios.post(`/api/workflow`, appState.workflow);

        const post_node = axios.post(`/api/graph/drop`, {
            workflow_id: appState.workflow._id,
            workspace_id: appState.workspace._id,
            reference: action.payload.oid,
            uid: modifiedAction.payload.uid,
            type: modifiedAction.payload.type,
            parameters: { index: modifiedAction.payload.index }
        });

        return result;
    }

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
        const { appState }: { appState: AppState } = store.getState();

        const post_workflow = axios.post(`/api/workflow`, appState.workflow);

        const post_node = axios.post(`/api/graph/add`, {
            workflow_id: appState.workflow._id,
            workspace_id: appState.workspace._id,
            reference: action.payload.oid,
            uid: modifiedAction.payload.uid,
            type: modifiedAction.payload.type,
            parameters: { index: modifiedAction.payload.index }
        });

        return result;
    }

    if (action.type === makeEdge.type) {
        // Call the next middleware or the reducer with the modified action
        const result = next(action);

        // Perform the action or side effect you want to do after the store update
        const { appState }: { appState: AppState } = store.getState();
        const post_result = axios.post(`/api/workflow`, appState.workflow);

        const target = action.payload.connection.target;
        const source = action.payload.connection.source;
        const type = action.payload.connection.targetHandle.split('_')[1];

        // Connection:
        //     source: string | null; (string is ID)
        //     target: string | null; (string is ID)
        //     sourceHandle: string | null;
        //     targetHandle: string | null; (string is `${id}_${type}`)

        const edge_add_result = axios.post(`/api/graph/edge/add`, {
            workflow_id: appState.workflow._id,
            workspace_id: appState.workspace._id,
            changes: [
                {
                    source: source,
                    target: target,
                    type: type
                }
            ]
        });

        return result;
    }

    if (action.type === updateNodes.type) {
        // Call the next middleware or the reducer with the modified action
        const result = next(action);

        // Perform the action or side effect you want to do after the store update
        const { appState }: { appState: AppState } = store.getState();
        const post_result = axios.post(`/api/workflow`, appState.workflow);

        const changes: Array<NodeChange> = action.payload.changes;

        const removes: Array<NodeRemoveChange> = changes.filter(change => change.type == 'remove');
        const remove_ids = removes.map(change => change.id);
        const edgesToRemove = appState.workflow.edges.filter(
            (edge: Edge) =>
                edge.target in remove_ids || edge.source in remove_ids
        );

        store.dispatch(
            updateEdges({
                changes: edgesToRemove.map((edge: Edge) => {
                    const change: EdgeRemoveChange =  {
                        id: edge.id,
                        type: 'remove'
                    };
                    return change
                })
            })
        );

        const remove_node = axios.post(`/api/graph/remove`, {
            workflow_id: appState.workflow._id,
            workspace_id: appState.workspace._id,
            uids: remove_ids
        });
        return result;
    }

    if (action.type === updateEdges.type) {
        

        const { appState }: { appState: AppState } = store.getState();

        const changes = action.payload.changes;

        const adds: Array<EdgeAddChange> = changes.filter(
            (change: EdgeChange) => change.type == 'add'
        );

        const removes = changes.filter(
            (change: EdgeChange) => change.type == 'remove'
        );


        if (adds.length > 0) {
            const add_edges = axios.post(`/api/graph/edge/add`, {
                workflow_id: appState.workflow._id,
                workspace_id: appState.workspace._id,
                changes: adds.map((a) => {
                    return {
                        target: a.item.target,
                        source: a.item.source,
                        type: a.item.targetHandle?.split('_')[1]
                    };
                })
            });
        }


        const remove_ids = removes.map((change: EdgeRemoveChange) => change.id);

        const edges = appState.workflow.edges.filter((edge: Edge) => remove_ids.includes(edge.id));

        if (remove_ids.length > 0) {
            const remove_edge = axios.post(`/api/graph/edge/remove`, {
                workflow_id: appState.workflow._id,
                workspace_id: appState.workspace._id,
                edges: edges
            });
        }
        const result = next(action);
        return result

  
    }

    if (action.type === addGroup.type) {
        const add_group = axios.post(`/api/group/add`, {
            group: {...action.payload}
        });
    }

    if (action.type === removeGroup.type) {
        const remove_group = axios.post(`/api/group/remove`, {
            group: action.payload.oid
        });
        store.dispatch(updateNodes({
            changes: [{
                id: action.payload.uid,
                type: "remove"

            }]
        }));
    }

    if (action.type === addNote.type) {
        const { appState }: { appState: AppState } = store.getState();
        const { _id: workspace_id } = appState.workspace
        const add_note = axios.post(`/api/note/add`, {
            workspace_id: workspace_id,
            label: action.payload.label
        });
    }

    if (action.type === removeNote.type) {
        const remove_note = axios.post(`/api/note/remove`, {
            note: action.payload.oid
        });
        store.dispatch(updateNodes({
            changes: [{
                id: action.payload.uid,
                type: "remove"

            }]
        }));

    }

    if (action.type === makeGroupFromBookmarks.type) {
        const add_group = axios.post(`/api/group/add`, {
            group: {...action.payload}
        });
    }

    if (action.type === addDocumentToGroup.type) {
        const { appState }: { appState: AppState } = store.getState();
        const { _id: workspace_id } = appState.workspace
        const { _id: workflow_id } = appState.workflow

        const add_document = axios.post(`/api/group/doc/add`, {
            group_id: action.payload.group_id,
            document_id: action.payload.document_id,
            workspace_id: workspace_id,
            workflow_id: workflow_id

        });

        store.dispatch(updateNodes({
            changes: [
              {
                id: action.payload.document_id,
                type: "remove"
              }
            ]
        }))
    }

    if (action.type === removeDocumentFromGroup.type) {
        const { appState }: { appState: AppState } = store.getState();
        const { _id: workspace_id } = appState.workspace
        const { _id: workflow_id } = appState.workflow
        const remove_document = axios.post(`/api/group/doc/remove`, {
            group_id: action.payload.group_id,
            document_id: action.payload.document_id,
            workspace_id: workspace_id,
            workflow_id: workflow_id
        });
        
    }

    


    
    const callPost = (task_name: string) => {
        const { appState }: { appState: AppState } = store.getState();
        return post({
            task: task_name,
            args: {
                ...headers(appState),
                ...action.payload
            }
        });
    };

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
        case recolorGroup.type:
            callPost('recolor_group');
            break;
        case relabelGroup.type:
            callPost('relabel_group');
            break;
        case mark.type:
            callPost('mark');
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
        case relabelNote.type:
            callPost('relabel_note');
            break;
        
    }

    // Call the next middleware or the reducer
    const result = next(action);
    return result;
};

export const store = configureStore({
    reducer: {
        // [appApi.reducerPath]: appApi.reducer,
        appState: appState
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            // .concat(appApi.middleware)
            .concat(actionMiddleware)
});

export const makeStore = () => store;

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
