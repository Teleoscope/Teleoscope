// imports
import React, { useState, useContext } from "react";
import RGL, { WidthProvider } from "react-grid-layout";

// custom
import Window from "../components/Window"
import FABMenu from "../components/FABMenu"
import Draggable from "../components/Draggable"
import { getDefaultWindow } from "../components/DefaultWindow"

// css
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

// actions
import { useSelector, useDispatch } from "react-redux";
import { deselectAll, checkWindow, removeWindow, addWindow, loadWindows } from "../actions/windows";

// utils
import { 
  reorient, 
  initialize_teleoscope, 
  save_UI_state, 
  save_teleoscope_state, 
  load_teleoscope_state, 
  initialize_session, 
  add_post_to_group 
} from "../components/Stomp.js";

// contexts
import { StompContext } from '../context/StompContext'

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
  const client = useContext(StompContext)

  const windows = useSelector((state) => state.windows.windows);
  const posts = windows.filter(w => w.type == "Post");
  const groups = windows.filter(w => w.type == "Group");
  const dragged_item = useSelector((state) => state.windows.dragged);
	const dispatch = useDispatch();

  const dropping = (layout, item, e) => {
    // var item = getDefaultWindow();
    dispatch(addWindow({i: dragged_item.id, type: dragged_item.type, ...item}));
  }

  const checkCollisions = (newItem, placeholder) => {
    groups.forEach((w) => {
        if (collides(w, placeholder)) {
          dispatch(checkWindow({i: w.i, check:true}));
        } else if (w.isChecked == true) {
          dispatch(checkWindow({i: w.i, check:false}));
        }
      });
  }

  const handleCollisions = (layout, newItem, placeholder) => {
    if (newItem.i.split("%")[1] == "post") {
      checkCollisions(newItem, placeholder);
    }
  }

  const handleDragStop = (layout, newItem) => {
    dispatch(loadWindows(layout))
    var checked = windows.find(w => w.isChecked && w.type == "Group");
    if (checked && newItem.i.split("%")[1] == "post") {
      dispatch(removeWindow(newItem.i))
      // TODO
      add_post_to_group(client, checked.i.split("%")[0], newItem.i.split("%")[0])
      dispatch(checkWindow({i: checked.i, check:false}));
    }

    
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
        allowOverlap={true}
        preventCollision={true}
        onDrag={(layout, oldItem, newItem, placeholder, e, element) => handleCollisions(layout, newItem, placeholder)}
        onDragStop={(layout, oldItem, newItem, placeholder, e, element) => handleDragStop(layout, newItem)}
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


