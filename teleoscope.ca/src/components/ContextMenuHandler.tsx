import ContextMenu from "@/components/ContextMenu";

const ContextMenuHandler = ({handleCloseContextMenu, contextMenu}) => {
  return (
    <ContextMenu
      handleCloseContextMenu={handleCloseContextMenu}
      contextMenu={contextMenu}
    />
  );
};

export default ContextMenuHandler;
