// FlowProviderWrapper.jsx
import React from 'react';
import { ReactFlowProvider } from 'reactflow';

const FlowProviderWrapper = ({children}) => {
  return (
    <ReactFlowProvider>
      {children}
    </ReactFlowProvider>
  );
};

export default FlowProviderWrapper;
