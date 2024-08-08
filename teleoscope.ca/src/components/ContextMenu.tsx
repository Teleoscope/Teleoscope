import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { v4 as uuidv4 } from 'uuid';

// mui
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";

// actions
import { makeNode } from "@/actions/appState";
import WindowDefinitions from "./WindowFolder/WindowDefinitions";

export default function ContextMenu({ contextMenu, handleCloseContextMenu,  }) {
  const dispatch = useAppDispatch();

  const { workspace, workflow } = useAppSelector((state) => state.appState);
  const { color } = workflow.settings

  const handleAddNode = (id, type) => {    
    dispatch(makeNode({
      uid: uuidv4(), 
      type: type,
      width: workspace.settings?.document_width,
      height: workspace.settings?.document_height,
      x: contextMenu.worldX,
      y: contextMenu.worldY
    }));
  };

  const handleOpenNewWindow = (menu_action) => {
    const w = { ...WindowDefinitions(menu_action) };
    handleAddNode(w.tag, w.type);
    handleCloseContextMenu();
  };


  const handleClose = () => {
    handleCloseContextMenu();

  };

  

  return (
    <Menu
      open={contextMenu !== null}
      onClose={() => handleClose()}
      anchorReference="anchorPosition"
      anchorPosition={
        contextMenu !== null
          ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
          : undefined
      }
    >
      

      <MenuItem onClick={() => handleOpenNewWindow("Search")}>
        <span style={{marginRight: "0.25em"}}>{WindowDefinitions("Search").icon(color)}</span> New Search
      </MenuItem>
      <MenuItem onClick={() => handleOpenNewWindow("Group")}>
        <span style={{marginRight: "0.25em"}}>{WindowDefinitions("Group").icon(color)}</span> New Group
      </MenuItem>
      <MenuItem onClick={() => handleOpenNewWindow("Rank")}>
      <span style={{marginRight: "0.25em"}}>{WindowDefinitions("Rank").icon(color)}</span> New Rank
      </MenuItem>
      <MenuItem onClick={() => handleOpenNewWindow("Projection")}>
      <span style={{marginRight: "0.25em"}}>{WindowDefinitions("Projection").icon(color)}</span> New Projection
      </MenuItem>
      <MenuItem onClick={() => handleOpenNewWindow("Note")}>
      <span style={{marginRight: "0.25em"}}>{WindowDefinitions("Note").icon(color)}</span> New Note
      </MenuItem>
      <Divider></Divider>
      
      <MenuItem onClick={() => handleOpenNewWindow("Groups")}>
        Open Groups
      </MenuItem>
      <MenuItem onClick={() => handleOpenNewWindow("Notes")}>
        Open Notes
      </MenuItem>
      <MenuItem onClick={() => handleOpenNewWindow("Bookmarks")}>
        Open Bookmarks
      </MenuItem>
      
    </Menu>
  );
}
