// imports
import React from "react";
import RGL, { WidthProvider } from "react-grid-layout";

// custom
import WorkspaceItem from "../components/WorkspaceItem";
import ResponsivePostContent from "../components/ResponsivePostContent";
import GroupSelector from "../components/GroupSelector"
import BookmarkSelector from "../components/BookmarkSelector"
import PostTitle from "./PostTitle";
import Expander from "./Expander"
import PostListItem from "./PostListItem"


// css
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

// mui
import Card from '@mui/material/Card';
import Paper from '@mui/material/Paper';

// actions
import { useSelector, useDispatch } from "react-redux";
import { addWindow, reload } from "../actions/windows";
import { checker } from "../actions/checkedPosts";

const ReactGridLayout = WidthProvider(RGL);


function wrapLayout(windows, checked) {
  
  var ret = windows.map((w) => {
    if (w.type == "Post") {
      return (
        <Card 
          key={w.i}
          variant="outlined"
          style={{
            borderWidth: checked.indexOf(w.i) >= 0  ? 2 : 0,
            borderColor: checked.indexOf(w.i) >= 0 ? "#4e5cbc" : "white",
            boxShadow: checked.indexOf(w.i) >= 0 ? "1px 1px 8px #888888" : "2px 2px 8px #888888",
          }}
        >
        <PostListItem id={w.i} />
        </Card>
        )
    }  
  })
	return ret;
}


export default function WindowManager(props) {
  const windows = useSelector((state) => state.windows.windows);
  const dragged_id = useSelector((state) => state.windows.dragged);
  const checked = useSelector((state) => state.checkedPosts.value);
	const dispatch = useDispatch();
  const dropping = (layout, item, e) => {
    console.log("Dropping", layout, item, e);
    dispatch(addWindow(item));
  }
    return (
      <ReactGridLayout
        className="layout"
        layout={windows}
        cols={12}
        containerPadding={[80,0]}
        rowHeight={30}
        width={1200}
        compactionType={false}
        onDrop={(layout, item, e) => {dropping(layout, item, e)}}
        isDroppable={true}
        droppingItem={{ i: dragged_id, w: 1, h: 1 }}
        onLayoutChange={(layout) => dispatch(reload(layout))}
        style={{
          // backgroundColor:"blue",
          minHeight: "100%",
          zIndex: 0
        }}
      >
      {wrapLayout(windows, checked)}
      </ReactGridLayout>
    );
}