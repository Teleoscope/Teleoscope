// sagas.ts
import { put, takeEvery, delay, select, all } from 'redux-saga/effects';
import { setRefreshInterval, cancelRefreshInterval, dropNode, makeNode, makeEdge } from '@/actions/appState';
import { Node } from 'reactflow';
import { PayloadAction } from '@reduxjs/toolkit';
import { RootState } from './store';

// Define constants for the interval changes
const initialInterval = 250;  // Start interval at 250ms
const finalInterval = 60000;  // Maximum interval of 60 seconds
const increment = 250;        // Increment by 1000ms each step

// Saga to handle interval changes
function* changeInterval(action: PayloadAction<{ uid: string }>) {
  const uid = action.payload.uid;
  let currentInterval = initialInterval;

  while (currentInterval <= finalInterval) {
    yield delay(currentInterval);

    // Check if the node is still active
    const node: Node | undefined = yield select((state: RootState) => 
      state.appState.workflow.nodes.find((n: Node) => n.id === uid)
    );

    if (!node || !node.data.refreshing) {
      break;
    }

    // Update the interval in the store
    yield put(setRefreshInterval({ uid, refreshInterval: currentInterval }));

    // Increase the interval for the next iteration
    currentInterval = Math.min(finalInterval, currentInterval + increment);
  }

  // Once the interval reaches the max, cancel it
  yield put(cancelRefreshInterval({ uid }));
}

// Saga to handle node update, starting the interval change process
function* handleNodeUpdate(action: PayloadAction<{ uid: string }>) {
  const uid = action.payload.uid;

  // Start the initial refresh interval
  yield put(setRefreshInterval({ uid, refreshInterval: initialInterval }));

  // Trigger interval changes
  yield changeInterval({ payload: { uid }, type: 'changeInterval' });
}

// Watcher saga for setRefreshInterval actions
function* watchSetNodeInterval() {
  // Note: This might be redundant if `setRefreshInterval` is only called here and directly in handleNodeUpdate
}

// Watcher saga for node creation actions
function* watchNodeCreation() {
  yield takeEvery(dropNode.type, handleNodeUpdate);
  yield takeEvery(makeNode.type, handleNodeUpdate);
  yield takeEvery(makeEdge.type, handleNodeUpdate);
}

// Root saga
export default function* rootSaga() {
  yield all([
    watchNodeCreation(),
  ]);
}
