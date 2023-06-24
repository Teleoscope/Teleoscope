export const onDragStart = (event, oid, type) => {
    event.dataTransfer.setData("application/reactflow/type", type);
    event.dataTransfer.setData("application/reactflow/id", `${oid}`);
    event.dataTransfer.effectAllowed = "move";
  };