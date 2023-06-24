import { onDragStart } from "@/util/drag";
import React from "react";

const withDroppable = (DragItem) => {
  return function DroppableComponent(props) {
    const { id, type, typetag } = props;
    return (
      <div
        draggable={true}
        style={{ position: "relative" }}
        onDragStart={onDragStart}
      >
        <DragItem {...props} />
      </div>
    );
  };
};

export default withDroppable;
