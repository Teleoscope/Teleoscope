import React from "react";

const withDroppable = (DragItem) => {
  return function DroppableComponent(props) {
    const { id, type, typetag } = props;

    const onDragStart = (event) => {
      event.dataTransfer.setData("application/reactflow/type", type);
      event.dataTransfer.setData(
        "application/reactflow/id",
        `${id}%${typetag}`
      );
      event.dataTransfer.effectAllowed = "move";
    };

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
