// imports
import React, { useContext } from "react";
import RGL, { WidthProvider } from "react-grid-layout";
import { useAppSelector, useAppDispatch } from '@/util/hooks'
import { RootState } from '@/stores/store'

// custom
import WindowFactory from "./WindowFactory"
import { getDefaultWindow } from "./WindowDefault"

// css
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

// actions
import { checkWindow, removeWindow, addWindow, updateWindows } from "@/actions/windows";

// contexts
import { StompContext } from '@/components/Stomp'

const ReactGridLayout = WidthProvider(RGL);

const item = (id, type) => {
  const t = getDefaultWindow()
  t.i = id;
  t.type = type;
  return t;
}

const collides = (l1, l2) => {
  if (l1.i === l2.i) return false; // same element
  if (l1.x + l1.w <= l2.x) return false; // l1 is left of l2
  if (l1.x >= l2.x + l2.w) return false; // l1 is right of l2
  if (l1.y + l1.h <= l2.y) return false; // l1 is above l2
  if (l1.y >= l2.y + l2.h) return false; // l1 is below l2
  return true;
}

export default function WindowManager(props) {
  const userid = useAppSelector((state: RootState) => state.activeSessionID.userid); 
  const session_id = useAppSelector((state: RootState) => state.activeSessionID.value); 
  const bookmarks = useAppSelector((state: RootState) => state.bookmarker.value); 
  const client = useContext(StompContext)

  const windows = useAppSelector((state: RootState) => state.windows.windows);
  const collision = useAppSelector((state: RootState) => state.windows.collision);
  
  const groups = windows.filter(w => w.type == "Group");
  const dragged_item = useAppSelector((state: RootState) => state.windows.dragged);
  const dispatch = useAppDispatch();

  const dropping = (layout, item, e) => {
    item.resizeHandles = [];
    item.w = 4;
    dispatch(addWindow({ i: dragged_item.id, type: dragged_item.type, ...item }));
  }

  const checkCollisions = (newItem, placeholder) => {
    groups.forEach((w) => {
      if (collides(w, placeholder)) {
        dispatch(checkWindow({ i: w.i, check: true }));
      } else if (w.isChecked == true) {
        dispatch(checkWindow({ i: w.i, check: false }));
      }
    });
  }

  const handleCollisions = (layout, newItem, placeholder) => {
    if (newItem.i.split("%")[1] == "document") {
      checkCollisions(newItem, placeholder);
    }
  }

  const handleDragStop = (layout, newItem) => {
    dispatch(updateWindows(layout))

    const checked = windows.find(w => w.isChecked && w.type == "Group");
    if (checked && newItem.i.split("%")[1] == "document") {
      dispatch(removeWindow(newItem.i))
      client.add_document_to_group(checked.i.split("%")[0], newItem.i.split("%")[0])
      dispatch(checkWindow({ i: checked.i, check: false }));
    }
    handleLayoutChange(layout)
  }

  const handleLayoutChange = (layout) => {
    if (client.loaded) {
      client.save_UI_state(session_id, bookmarks, windows, [])
    }
  } 

  // type ItemCallback = 
  // (layout: Layout, oldItem: LayoutItem, newItem: LayoutItem,
  //  placeholder: LayoutItem, e: MouseEvent, element: HTMLElement)

  return (
    <ReactGridLayout
      className="layout"
      layout={windows}
      cols={24}
      containerPadding={[0, 0]}
      rowHeight={30}
      compactType={collision ? null : 'vertical'}
      onDrop={(layout, item, e) => { dropping(layout, item, e) }}
      isDroppable={true}
      droppingItem={item(dragged_item.id, dragged_item.type)}
      draggableHandle=".drag-handle"
      allowOverlap={collision}
      preventCollision={collision}
      onDrag={(layout, oldItem, newItem, placeholder, e, element) => handleCollisions(layout, newItem, placeholder)}
      onDragStop={(layout, oldItem, newItem, placeholder, e, element) => handleDragStop(layout, newItem)}
      onResizeStop={(layout) => dispatch(updateWindows(layout))}
      onLayoutChange={(layout) => {handleLayoutChange(layout)}}
      style={{
        backgroundColor: "#EEEEEE",
        minHeight: "100vh",
        zIndex: 0
      }}
    >
      {windows.map((w) => {
        const ref = React.createRef<HTMLDivElement>();
        return (
          <div
            ref={ref}
            key={w.i}
            style={{
              // padding:"1.5em",
              width: "100%",
              height: "100%",
              // backgroundColor: "red"
            }}
          >
            <WindowFactory id={w.i} windata={w} />
          </div>
        )
      })}
    </ReactGridLayout>
  )
}


