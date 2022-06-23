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
import CardActionArea from '@mui/material/CardActionArea';

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
            borderWidth: pc >= 0  ? 2 : 0,
            borderColor: pc >= 0 ? "#4e5cbc" : "white",
            boxShadow: pc >= 0 ? "1px 1px 8px #888888" : "2px 2px 8px #888888",

          }}
        >
        
        
        <CardActionArea
          onClick={() => handleClick(w.i, pc, dispatch)}
        >
          <WorkspaceItem id={w.i} />
        </CardActionArea>
        </Card>
        )
    }  
  })
	return ret;
}

// strangely, this is needed
function handleClick(id, index, dispatch) {
  if (index < 0) {
    dispatch(checker(id))
  } else {
    dispatch(checker(id))
  }
}

export default function WindowManager(props) {
  const windows = useSelector((state) => state.windows.windows);
  const dragged_id = useSelector((state) => state.windows.dragged);
  const checked = useSelector((state) => state.checkedPosts.value);
	const dispatch = useDispatch();

  const dropping = (layout, item, e) => {
    dispatch(addWindow({i: dragged_id, x: 0, y: 0, w: 3, h: 1}));
  }

  return (
      <ReactGridLayout
        className="layout"
        layout={windows}
        cols={12}
        containerPadding={[0,0]}
        rowHeight={30}
        width={1200}
        compactionType={false}
        onDrop={(layout, item, e) => {dropping(layout, item, e)}}
        isDroppable={true}
        droppingItem={{ i: dragged_id + "_temp", w: 2, h: 1 }}
        onLayoutChange={(layout) => dispatch(loadWindows(layout))}
        style={{
          backgroundColor: "#EEEEEE",
          minHeight: "100%",
          zIndex: 0
        }}
      >
      {wrapLayout(windows, checked, dispatch)}
      </ReactGridLayout>
  )
}