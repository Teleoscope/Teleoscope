// imports
import React from "react";
import RGL, { WidthProvider } from "react-grid-layout";
import useDimensions from "react-cool-dimensions";
import { SizeMe } from 'react-sizeme'

// custom
import WorkspaceItem from "../components/WorkspaceItem";
import GroupSelector from "../components/GroupSelector"
import BookmarkSelector from "../components/BookmarkSelector"
import PostTitle from "./PostTitle";
import Expander from "./Expander"
import PostListItem from "./PostListItem"
import Notes from "./Notes"
import Teleoscope from "./Teleoscope"
import Search from "../components/Search";

// css
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

// mui
import Card from '@mui/material/Card';
import Paper from '@mui/material/Paper';

// actions
import { useSelector, useDispatch } from "react-redux";
import { addWindow, loadWindows } from "../actions/windows";
import { checker } from "../actions/checkedPosts";

const ReactGridLayout = WidthProvider(RGL);

function wrapLayout(windows, checked, dispatch) {
  var ret = windows.map((w) => {
    var pc = checked.indexOf(w.i)
    if (w.type == "Post") {
      return (
        <Card
          key={w.i}
          variant="outlined"
          style={{
            borderWidth: pc >= 0  ? 4 : 0,
            borderColor: pc >= 0 ? "#4e5cbc" : "white",
            boxShadow: pc >= 0 ? "1px 1px 8px #888888" : "2px 2px 8px #888888",

          }}
        >      
          <WorkspaceItem id={w.i} />
        </Card>
        )
    }
    if (w.type == "Note") {
      return (
        <Card key={w.i} style={{backgroundColor: "yellow"}}>
          <Notes id={w.i}></Notes>
        </Card>
      )
    }
    if (w.type == "Teleoscope") {
      return (
        <div key={w.i}>
          <Teleoscope></Teleoscope>
        </div>
      )
    }
    if (w.type == "Search") {
      return (
       <Card key={w.i}>
         <Search></Search>
       </Card>
      )
    }


  })
	return ret;
}

export default function WindowManager(props) {
  console.log("RGL",ReactGridLayout?.state?.width)
  const windows = useSelector((state) => state.windows.windows);
  const dragged_id = useSelector((state) => state.windows.dragged);
  const checked = useSelector((state) => state.checkedPosts.value);
	const dispatch = useDispatch();
  const dropping = (layout, item, e) => {
    dispatch(addWindow({i: dragged_id, x: 0, y: 0, w: 3, h: 1, type: "Post"}));
  }

  return (
      <ReactGridLayout
        className="layout"
        allowOverlap={false}
        layout={windows}
        cols={12}
        containerPadding={[0,0]}
        rowHeight={30}
        compactionType={false}
        onDrop={(layout, item, e) => {dropping(layout, item, e)}}
        isDroppable={true}
        droppingItem={{ i: dragged_id + "_temp", w: 2, h: 1 }}
        onLayoutChange={(layout) => dispatch(loadWindows(layout))}
        style={{
          backgroundColor: "#EEEEEE",
          minHeight: "100vh",
          zIndex: 0
        }}
      >
      {wrapLayout(windows, checked, dispatch)}
      </ReactGridLayout>
  )
}