import { ReactFlowProvider } from 'reactflow';

const FlowProviderWrapper = ({children}) => {
  return (
    <ReactFlowProvider>
      {children}
    </ReactFlowProvider>
  );
};

export default FlowProviderWrapper;
