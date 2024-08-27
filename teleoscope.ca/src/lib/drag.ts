export const onDragStart = (event: DragEvent, oid: string, type: string, index=0) => {
    if (!event.dataTransfer) {
      return
    }
    event.dataTransfer.setData("application/reactflow/index", index.toString());
    event.dataTransfer.setData("application/reactflow/type", type);
    event.dataTransfer.setData("application/reactflow/id", `${oid}`);
    event.dataTransfer.effectAllowed = "move";
  };



export const findTargetNode = (node, nodes) => {
  // calculate the center point of the node from position and dimensions
  const centerX = node.position.x + node.width / 2;
  const centerY = node.position.y + node.height / 2;
  // find a node where the center point is inside
  const targetNode = nodes.find(
    (n) =>
      centerX > n.position.x &&
      centerX < n.position.x + n.width &&
      centerY > n.position.y &&
      centerY < n.position.y + n.height &&
      n.id !== node.id // this is needed, otherwise we would always find the dragged node
  );
  return targetNode
}


export const getClosestEdge = (node, nodes, edges) => {
  const X_MIN_DISTANCE = 50;
  const Y_MIN_DISTANCE = 100;
  
  const closestNode = nodes.filter(
    n => 
    n.data.type === "Rank"         || 
    n.data.type === "Projection"   ||
    n.data.type === "Exclusion"    ||
    n.data.type === "Intersection" ||
    n.data.type === "Union"        ||
    n.data.type === "Difference"
    
    ).reduce(
    (res, n) => {
      if (n.id !== node.id) {
        edges.forEach((e) => {
          if (e.source == node.id && e.target == n.id) {
            return;
          }
        })
        const _dx = (n.positionAbsolute.x) - (node.positionAbsolute.x + node.width);
        const _dy = (n.positionAbsolute.y + n.height/2) - (node.positionAbsolute.y + node.height/2);
        
        const dx = Math.sqrt(_dx * _dx);
        const dy = Math.sqrt(_dy * _dy);

        if (dx < res.distance && dx < X_MIN_DISTANCE && dy < Y_MIN_DISTANCE) {
          res.distance = dx;
          res.node = n;
        }
      }
      return res;
    },
    {
      distance: Number.MAX_VALUE,
      node: null,
    }
  );

  if (!closestNode.node) {
    return null
  }

  return {
    id: `${node.id}-${closestNode.node.id}`,
    source: node.id,
    target: closestNode.node.id,
  };
}

