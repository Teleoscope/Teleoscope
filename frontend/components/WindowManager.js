// imports
import React from "react";
import RGL, { WidthProvider } from "react-grid-layout";

// custom
import Window from "../components/Window"
import FABMenu from "../components/FABMenu"

// css
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

// actions
import { useSelector, useDispatch } from "react-redux";
import { addWindow, loadWindows } from "../actions/windows";

const ReactGridLayout = WidthProvider(RGL);

const item = (id, type) => {
  return { 
  i: id,
  x: 0,
  y: 0,
  w: 2,
  h: 4,
  minW: 1,
  maxW: 10000,
  minH: 1,
  maxH: 10000,
  static: false,
  isDraggable: true,
  isResizable: true,
  resizeHandles: ['se'], // <'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'> 
  isBounded: false,
  type: type
}}



export default function WindowManager(props) {
  const windows = useSelector((state) => state.windows.windows);
  const dragged_item = useSelector((state) => state.windows.dragged);
	const dispatch = useDispatch();

  const dropping = (layout, item, e) => {
    dispatch(addWindow({i: dragged_item.id, type: dragged_item.type, ...item}))
  }

  return (
      <ReactGridLayout
        className="layout"
        allowOverlap={false}
        layout={windows}
        cols={12}
        containerPadding={[0,0]}
        rowHeight={30}
        compactType={null}
        onDrop={(layout, item, e) => {dropping(layout, item, e)}}
        isDroppable={true}
        droppingItem={item(dragged_item.id, dragged_item.type)}
        draggableHandle=".drag-handle"
        allowOverlap={true}
        preventCollision={true}
        onLayoutChange={(layout) => dispatch(loadWindows(layout))}
        style={{
          backgroundColor: "#EEEEEE",
          minHeight: "100vh",
          zIndex: 0
        }}
      >
      {windows.map((w) => {
        const ref = React.createRef()
        return (<Window ref={ref} windata={w} key={w.i}/>)
      })}
      </ReactGridLayout>
  )
}


