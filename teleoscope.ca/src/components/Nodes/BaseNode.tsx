import { Node, NodeProps, ReactFlowState, useStore } from 'reactflow';
import WindowFactory from '@/components/WindowFolder/WindowFactory';
import { NodeResizer } from '@reactflow/node-resizer';
import { useAppSelector } from '@/lib/hooks';
import { useSWRF } from '@/lib/swr';
import { Graph } from '@/types/graph';

const defaultSize = (s: ReactFlowState, id: string) => {
    const node = s.nodeInternals.get(id);
    return {
        x: node!.positionAbsolute!.x,
        y: node!.positionAbsolute!.y,
        width: node!.width,
        height: node!.height,
        minHeight: 35,
        minWidth: 60
    };
};

export type DefaultSizeType = ReturnType<typeof defaultSize>;
export type ReactFlowNodeData = DefaultSizeType & Node['data'];
export type NodeData = {
    reactflow_node: ReactFlowNodeData;
    graph_node: Graph | null;
};

const handleCSS = {
    width: '10px',
    height: '10px',
    borderRadius: '100%'
};

function BaseNode({ data, id, selected }: NodeProps) {
    const size = useStore((s) => defaultSize(s, id));
    const reactflow_node: ReactFlowNodeData = { id, ...data, ...size };
    const settings = useAppSelector(
        (state) => state.appState.workflow.settings
    );
    const { data: graph_node }: { data: Graph } = useSWRF(
        id ? `/api/graph?uid=${id}` : null, {
            refreshInterval: data?.updateInterval ? data.updateInterval : 0
        }
    );

    return (
        <>
            <NodeResizer
                color={settings.color}
                isVisible={selected}
                minWidth={reactflow_node.minWidth}
                minHeight={reactflow_node.minHeight}
                handleStyle={handleCSS}
            />
            <WindowFactory
                reactflow_node={reactflow_node}
                graph_node={graph_node}
            />
        </>
    );
}

export default BaseNode;
