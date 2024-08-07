import { configureStore } from '@reduxjs/toolkit';
import crypto from 'crypto';
import appState, {
    updateEdges,
    updateNodes,
    updateSearch,
    makeGroupFromBookmarks,
    removeCluster,
    removeWorkflow,
    addGroup,
    recolorGroup,
    relabelGroup,
    mark,
    removeDocumentFromGroup,
    addDocumentToGroup,
    copyCluster,
    addNote,
    relabelNote,
    removeNote,
    initializeWorkflow,
    makeNode,
    makeEdge,
    setColor,
    relabelWorkflow,
    updateTimestamps,
    loadAppData,
    dropNode,
    removeGroup,
    loadWorkflow,
    resetTimestamps,
    setWorkflowSettings,
    setWorkspaceSettings,
    loadState,
    saveNote
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
import { mutate } from 'swr';
import WindowDefinitions from '@/components/WindowFolder/WindowDefinitions';

interface AppState {
    workflow: Workflows;
    workspace: Workspaces;
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
        action.type !== resetTimestamps.type &&
        action.type !== updateTimestamps.type &&
        action.type !== loadAppData.type &&
        action.type !== loadState.type
    ) {
        const { appState }: { appState: AppState } = store.getState();
        console.log(
            action.type,
            action.payload,
            appState?.workflow?.logical_clock,
            appState
        );
        store.dispatch(updateTimestamps());
    } else {
        const { appState }: { appState: AppState } = store.getState();
        console.log(
            action.type,
            action.payload,
            appState?.workflow?.logical_clock,
            appState
        );
        const post_node = axios.post(`/api/history`, {
            history: {
                action: action.type,
                payload: action.payload,
                state: appState
            }
        });
    }

    // if (action.type === updateNodes.type ||
    //     action.type === updateEdges.type ||
    //     action.type === updateNode.type ||
    //     action.type === updateNote.type ||
    //     action.type === makeEdge.type ||
    //     action.type === addDocumentToGroup.type ||
    //     action.type === removeDocumentFromGroup.type) {

    // }

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

        const apipath = WindowDefinitions(modifiedAction.payload.type).apipath;

        const post_node = axios
            .post(`/api/graph/drop`, {
                workflow_id: appState.workflow._id,
                workspace_id: appState.workspace._id,
                reference: action.payload.oid,
                uid: modifiedAction.payload.uid,
                type: modifiedAction.payload.type,
                parameters: { index: modifiedAction.payload.index }
            })
            .then(() =>
                mutate(
                    (key) =>
                        typeof key === 'string' &&
                        key.startsWith(`/api/${apipath}`)
                )
            );

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

        const post_node = axios
            .post(`/api/graph/add`, {
                workflow_id: appState.workflow._id,
                workspace_id: appState.workspace._id,
                reference: action.payload.oid,
                uid: modifiedAction.payload.uid,
                type: modifiedAction.payload.type,
                parameters: { index: modifiedAction.payload.index }
            })
            .then(() =>
                mutate(
                    (key) =>
                        typeof key === 'string' && key.startsWith(`/api/work`)
                )
            );

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

        const edge_add_result = axios
            .post(`/api/graph/edge/add`, {
                workflow_id: appState.workflow._id,
                workspace_id: appState.workspace._id,
                changes: [
                    {
                        source: source,
                        target: target,
                        type: type
                    }
                ]
            })
            .then(() =>
                mutate(
                    (key) =>
                        typeof key === 'string' && key.startsWith(`/api/graph`)
                    // (key) => typeof key === 'string' && key.startsWith(`/api/${apipath}`)
                )
            );

        return result;
    }

    if (action.type === updateNodes.type) {
        // Call the next middleware or the reducer with the modified action
        const result = next(action);

        // Perform the action or side effect you want to do after the store update
        const { appState }: { appState: AppState } = store.getState();
        const post_result = axios.post(`/api/workflow`, appState.workflow);

        const changes: Array<NodeChange> = action.payload.changes;

        const removes: Array<NodeRemoveChange> = changes.filter(
            (change) => change.type == 'remove'
        );
        const remove_ids = removes.map((change) => change.id);
        const edgesToRemove = appState.workflow.edges.filter(
            (edge: Edge) =>
                edge.target in remove_ids || edge.source in remove_ids
        );

        if (edgesToRemove.length > 0) {
            store.dispatch(
                updateEdges({
                    changes: edgesToRemove.map((edge: Edge) => {
                        const change: EdgeRemoveChange = {
                            id: edge.id,
                            type: 'remove'
                        };
                        return change;
                    })
                })
            );
        }

        if (remove_ids.length > 0) {
            const remove_node = axios.post(`/api/graph/remove`, {
                workflow_id: appState.workflow._id,
                workspace_id: appState.workspace._id,
                uids: remove_ids
            });
        }

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

        const edges = appState.workflow.edges.filter((edge: Edge) =>
            remove_ids.includes(edge.id)
        );

        if (remove_ids.length >= 0) {
            const remove_edge = axios.post(`/api/graph/edge/remove`, {
                workflow_id: appState.workflow._id,
                workspace_id: appState.workspace._id,
                edges: edges
            });
        }
        const result = next(action);
        return result;
    }

    if (action.type === addGroup.type) {
        const add_group = axios
            .post(`/api/group/add`, {
                group: { ...action.payload }
            })
            .then(() =>
                mutate(
                    (key) =>
                        typeof key === 'string' && key.startsWith(`/api/group`)
                )
            );
    }

    if (action.type === removeGroup.type) {
        const remove_group = axios
            .post(`/api/group/remove`, {
                group: action.payload.oid
            })
            .then(() =>
                mutate(
                    (key) =>
                        typeof key === 'string' && key.startsWith(`/api/group`)
                )
            );
        store.dispatch(
            updateNodes({
                changes: [
                    {
                        id: action.payload.uid,
                        type: 'remove'
                    }
                ]
            })
        );
    }

    if (action.type === addNote.type) {
        const { appState }: { appState: AppState } = store.getState();
        const { _id: workspace_id } = appState.workspace;
        const add_note = axios
            .post(`/api/note/add`, {
                workspace_id: workspace_id,
                label: action.payload.label
            })
            .then(() =>
                mutate(
                    (key) =>
                        typeof key === 'string' && key.startsWith(`/api/note`)
                )
            );
    }

    if (action.type === removeNote.type) {
        const remove_note = axios
            .post(`/api/note/remove`, {
                note: action.payload.oid
            })
            .then(() =>
                mutate(
                    (key) =>
                        typeof key === 'string' && key.startsWith(`/api/note`)
                )
            );
        store.dispatch(
            updateNodes({
                changes: [
                    {
                        id: action.payload.uid,
                        type: 'remove'
                    }
                ]
            })
        );
    }

    if (action.type === makeGroupFromBookmarks.type) {
        const add_group = axios
            .post(`/api/group/add`, {
                group: { ...action.payload }
            })
            .then(() =>
                mutate(
                    (key) =>
                        typeof key === 'string' && key.startsWith(`/api/group`)
                )
            );
    }

    if (action.type === addDocumentToGroup.type) {
        const { appState }: { appState: AppState } = store.getState();
        const { _id: workspace_id } = appState.workspace;
        const { _id: workflow_id } = appState.workflow;

        const add_document = axios
            .post(`/api/group/doc/add`, {
                group_id: action.payload.group_id,
                document_id: action.payload.document_id,
                workspace_id: workspace_id,
                workflow_id: workflow_id
            })
            .then(() =>
                mutate(
                    (key) =>
                        typeof key === 'string' && key.startsWith(`/api/group`)
                )
            );

        store.dispatch(
            updateNodes({
                changes: [
                    {
                        id: action.payload.document_id,
                        type: 'remove'
                    }
                ]
            })
        );
    }

    if (action.type === removeDocumentFromGroup.type) {
        const { appState }: { appState: AppState } = store.getState();
        const { _id: workspace_id } = appState.workspace;
        const { _id: workflow_id } = appState.workflow;
        const remove_document = axios
            .post(`/api/group/doc/remove`, {
                group_id: action.payload.group_id,
                document_id: action.payload.document_id,
                workspace_id: workspace_id,
                workflow_id: workflow_id
            })
            .then(() =>
                mutate(
                    (key) =>
                        typeof key === 'string' && key.startsWith(`/api/group`)
                )
            );
    }

    if (action.type === initializeWorkflow.type) {
        const { appState }: { appState: AppState } = store.getState();
        const { _id: workspace_id } = appState.workspace;
        const initialize_workflow = axios
            .post(`/api/workflow/add`, {
                workspace_id: workspace_id,
                label: action.payload.label
            })
            .then(() =>
                mutate(
                    (key) =>
                        typeof key === 'string' && key.startsWith(`/api/work`)
                )
            );
    }

    if (action.type === removeWorkflow.type) {
        const { appState }: { appState: AppState } = store.getState();
        const { _id: workspace_id } = appState.workspace;
        const alt_wf = appState.workspace.workflows?.find(
            (w: Workspaces) => w._id != action.payload.workflow_id
        );

        if (appState.workflow._id == workspace_id) {
            store.dispatch(
                loadWorkflow({
                    workflow_id: alt_wf._id,
                    workspace_id: appState.workspace._id
                })
            );
        }
        const remove_workflow = axios
            .post(`/api/workflow/remove`, {
                workspace_id: workspace_id,
                workflow_id: action.payload.workflow_id
            })
            .then(() =>
                mutate(
                    (key) =>
                        typeof key === 'string' && key.startsWith(`/api/work`)
                )
            );
    }

    if (action.type === loadWorkflow.type) {
        const { appState }: { appState: AppState } = store.getState();
        const { _id: workspace_id } = appState.workspace;
        const load_workspace = axios
            .post(`/api/workspace`, {
                workspace_id: workspace_id,
                workflow_id: action.payload.workflow_id
            })
            .then((res) => {
                store.dispatch(loadState({ state: res.data }));
                mutate(
                    (key) =>
                        typeof key === 'string' && key.startsWith(`/api/work`)
                );
            });
    }

    if (
        action.type === setColor.type ||
        action.type === setWorkflowSettings.type ||
        action.type === setWorkspaceSettings.type
    ) {
        const result = next(action);
        // Perform the action or side effect you want to do after the store update
        const { appState }: { appState: AppState } = store.getState();
        const post_result = axios.post(`/api/workflow`, appState.workflow);
    }

    if (action.type === saveNote.type) {
        const post_result = axios
            .post(`/api/note/save`, {
                note_id: action.payload.note._id,
                content: action.payload.content,
                text: action.payload.text
            })
            .then(() =>
                mutate(
                    (key) =>
                        typeof key === 'string' && key.startsWith(`/api/note`)
                )
            );
        const result = next(action);
    }

    if (action.type === updateNode.type) {
        const { appState }: { appState: AppState } = store.getState();
        const { _id: workspace_id } = appState.workspace;
        const { _id: workflow_id } = appState.workflow;

        const apipath = WindowDefinitions(action.payload.node.type).apipath;

        const post_result = axios
            .post(`/api/graph/update`, {
                workspace_id: workspace_id,
                workflow_id: workflow_id,
                parameters: action.payload.parameters,
                uid: action.payload.node.uid
            })
            .then(() =>
                mutate(
                    (key) =>
                        typeof key === 'string' &&
                        key.startsWith(`/api/${apipath}`)
                )
            );
    }

    if (action.type === mark.type) {
        const { appState }: { appState: AppState } = store.getState();
        const { _id: workspace_id } = appState.workspace;
        axios
            .post(`/api/document/mark`, {
                workspace_id: workspace_id,
                read: action.payload.read,
                document: action.payload.document_id
            })
            .then(() =>
                mutate(
                    (key) =>
                        typeof key === 'string' &&
                        key.startsWith(
                            `/api/document?document=${action.payload.document_id}`
                        )
                )
            );
    }

    if (action.type === relabelWorkflow.type) {
        const { appState }: { appState: AppState } = store.getState();
        const { _id: workspace_id } = appState.workspace;
        const { _id: workflow_id } = appState.workflow;
        axios.post(`/api/workflow/relabel`, {
            workspace_id: workspace_id,
            workflow_id: workflow_id,
            label: action.payload.document_id
        });
    }

    if (action.type === relabelNote.type) {
        const { appState }: { appState: AppState } = store.getState();
        const { _id: workspace_id } = appState.workspace;
        const { _id: workflow_id } = appState.workflow;
        axios.post(`/api/note/relabel`, {
            workspace_id: workspace_id,
            note_id: action.payload.note_id,
            label: action.payload.label
        }).then(() => mutate(
            (key) =>
                typeof key === 'string' &&
                key.startsWith(
                    `/api/note?note=${action.payload.note_id}`
                )
        ));;
    }

    if (action.type === relabelGroup.type) {
        const { appState }: { appState: AppState } = store.getState();
        const { _id: workspace_id } = appState.workspace;
        const { _id: workflow_id } = appState.workflow;
        axios.post(`/api/group/relabel`, {
            workspace_id: workspace_id,
            group_id: action.payload.group_id,
            label: action.payload.label
        }).then(() => mutate(
            (key) =>
                typeof key === 'string' &&
                key.startsWith(
                    `/api/group?group=${action.payload.group_id}`
                )
        ));
    }

    if (action.type === recolorGroup.type) {
        const { appState }: { appState: AppState } = store.getState();
        const { _id: workspace_id } = appState.workspace;
        const { _id: workflow_id } = appState.workflow;
        axios.post(`/api/group/recolor`, {
            workspace_id: workspace_id,
            group_id: action.payload.group_id,
            color: action.payload.color
        }).then(() => mutate(
            (key) =>
                typeof key === 'string' &&
                key.startsWith(
                    `/api/group?group=${action.payload.group_id}`
                )
        ));
    }

    if (action.type === updateSearch.type) {
        const { appState }: { appState: AppState } = store.getState();
        const { _id: workspace_id } = appState.workspace;
        const { _id: workflow_id } = appState.workflow;
        axios.post(`/api/search/update`, {
            workspace_id: workspace_id,
            search_id: action.payload.search_id,
            query: action.payload.query
        });
    }

    switch (action.type) {
        case copyDoclistsToGroups.type:
            break;
        case removeCluster.type:
            break;
        case copyCluster.type:
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
