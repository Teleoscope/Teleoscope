// imports
import React, { useState } from "react";
import RGL, { WidthProvider } from "react-grid-layout";

// custom
import Window from "../Window/Window"
import FABMenu from "../FABMenu"
import Draggable from "../Draggable"
import { getDefaultWindow } from "../DefaultWindow"

// css
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

// actions
import { useSelector, useDispatch } from "react-redux";
import { addWindow, loadWindows } from "../../actions/windows";

const ReactGridLayout = WidthProvider(RGL);

const item = (id, type) => {
  var t = getDefaultWindow()
  t.i = id;
  t.type = type;
  return t;
}

const collides = (l1, l2) =>  {
  if (l1.i === l2.i) return false; // same element
  if (l1.x + l1.w <= l2.x) return false; // l1 is left of l2
  if (l1.x >= l2.x + l2.w) return false; // l1 is right of l2
  if (l1.y + l1.h <= l2.y) return false; // l1 is above l2
  if (l1.y >= l2.y + l2.h) return false; // l1 is below l2
  return true;
}



export default function WindowManager(props) {
  const windows = useSelector((state) => state.windows.windows);
  const dragged_item = useSelector((state) => state.windows.dragged);
	const dispatch = useDispatch();
  const [ droppedWindow, setDroppedWindow ] = useState(false);
  const [ receivingWindow, setReceivingWindow ] = useState(false);

  const dropping = (layout, item, e) => {
    dispatch(addWindow({i: dragged_item.id, type: dragged_item.type, ...item}));
  }

  const checkCollisions = (newItem, placeholder) => {
    windows.forEach((w) => {
      if (w.type == "Group" || w.type == "Post") {
        if (collides(w, placeholder)) {
          console.log("collide", w, newItem);
          return {
            w: w, 
            item: newItem,
          };
        }  
      }
    })
    return {
      w: false,
      item: false
    }
  }

  const handleCollisions = (layout, newItem, placeholder) => {
    var { w, item } = checkCollisions(newItem, placeholder);
    if ( w && item ) {
      setDroppedWindow(item);
      setReceivingWindow(w);
    } else {
      setDroppedWindow(false);
      setReceivingWindow(false);
    }
  }
  const handleDragStop = (layout) => {
    dispatch(loadWindows(layout))
    if (droppedWindow && receivingWindow){
      dropWindow(droppedWindow, receivingWindow);
      setDroppedWindow(false);
      setReceivingWindow(false);
    }
  }

  const dropWindow = (droppedWindow, receivingWindow) => {
    // get rid of dropping
    // if receiving is a Group, then add dropping to Group
    // if receving is a post, make a new Group from both posts 
    // and also get rid of receving

  }

  // type ItemCallback = 
  // (layout: Layout, oldItem: LayoutItem, newItem: LayoutItem,
  //  placeholder: LayoutItem, e: MouseEvent, element: HTMLElement)

  return (
      <ReactGridLayout
        className="layout"
        allowOverlap={false}
        layout={windows}
        cols={24}
        containerPadding={[0,0]}
        rowHeight={30}
        compactType={null}
        onDrop={(layout, item, e) => {dropping(layout, item, e)}}
        isDroppable={true}
        droppingItem={item(dragged_item.id, dragged_item.type)}
        draggableHandle=".drag-handle"
        allowOverlap={false}
        preventCollision={true}
        onDrag={(layout, oldItem, newItem, placeholder, e, element) => handleCollisions(layout, newItem, placeholder)}
        onDragStop={(layout)=> handleDragStop(layout)}
        onResizeStop={(layout)=> dispatch(loadWindows(layout))}
        onLayoutChange={(layout) => {
          // dispatch(loadWindows(layout))
        }}
        style={{
          backgroundColor: "#EEEEEE",
          minHeight: "100vh",
          zIndex: 0
        }}
      >
      {windows.map((w) => {
        const ref = React.createRef()
        return (
            <div 
              ref={ref} 
              key={w.i} 
              style={{
                // padding:"1.5em",
                width:"100%",
                height:"100%",
                // backgroundColor: "red"
              }}
            >
                <Draggable id={w.i} windata={w} />
            </div>
        )
      })}
      </ReactGridLayout>
  )
}


