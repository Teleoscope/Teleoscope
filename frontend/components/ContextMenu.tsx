import { useAppDispatch, useWindowDefinitions } from "@/util/hooks";

// mui
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";

// custom components 
import { useSelector } from "react-redux";

// actions
import { makeNode } from "@/actions/windows";

// contexts
import { useStomp } from "@/util/Stomp";

export default function ContextMenu(props) {
  const client = useStomp();
  const dispatch = useAppDispatch();
  

  const wdefs = useWindowDefinitions();
  const settings = useSelector((state) => state.windows.settings);

  const handleAddNode = (id, type) => {    
    dispatch(makeNode({
      client: client,
      oid: id, 
      type: type,
      width: settings.default_document_width,
      height: settings.default_document_height,
      x: props.contextMenu.worldX, 
      y: props.contextMenu.worldY
    }));
  };

  const handleOpenNewWindow = (menu_action) => {
    const w = { ...wdefs.definitions()[menu_action] };
    handleAddNode(w.tag, w.type);
    props.handleCloseContextMenu();
  };


  const handleClose = () => {
    props.handleCloseContextMenu();

  };

  

  return (
    <Menu
      open={props.contextMenu !== null}
      onClose={() => handleClose()}
      anchorReference="anchorPosition"
      anchorPosition={
        props.contextMenu !== null
          ? { top: props.contextMenu.mouseY, left: props.contextMenu.mouseX }
          : undefined
      }
    >
      

      <MenuItem onClick={() => handleOpenNewWindow("Search")}>
        <span style={{marginRight: "0.25em"}}>{wdefs.definitions()["Search"].icon()}</span> New Search
      </MenuItem>
      <MenuItem onClick={() => handleOpenNewWindow("Group")}>
        <span style={{marginRight: "0.25em"}}>{wdefs.definitions()["Group"].icon()}</span> New Group
      </MenuItem>
      <MenuItem onClick={() => handleOpenNewWindow("Teleoscope")}>
      <span style={{marginRight: "0.25em"}}>{wdefs.definitions()["Teleoscope"].icon()}</span> New Teleoscope
      </MenuItem>
      <MenuItem onClick={() => handleOpenNewWindow("Projection")}>
      <span style={{marginRight: "0.25em"}}>{wdefs.definitions()["Projection"].icon()}</span> New Projection
      </MenuItem>
      <MenuItem onClick={() => handleOpenNewWindow("Note")}>
      <span style={{marginRight: "0.25em"}}>{wdefs.definitions()["Note"].icon()}</span> New Note
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
