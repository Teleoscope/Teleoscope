// ContextMenuHandler.tsx
import React from 'react';
import ContextMenu from "@/components/Context/ContextMenu";

const ContextMenuHandler = ({handleCloseContextMenu, contextMenu}) => {
  return (
    <ContextMenu
      handleCloseContextMenu={handleCloseContextMenu}
      contextMenu={contextMenu}
    />
  );
};

export default ContextMenuHandler;
