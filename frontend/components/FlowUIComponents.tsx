// FlowUIComponents.tsx
import React from 'react';
import { MiniMap, Controls, Background, Panel } from 'reactflow';

const FlowUIComponents = ({fabWrapper}) => {
  return (
    <>
      <Background />
      <MiniMap zoomable pannable />
      <Controls />
      <Panel position="top-left" style={{ margin: "2em" }}>
        {fabWrapper}
      </Panel>
    </>
  );
};

export default FlowUIComponents;