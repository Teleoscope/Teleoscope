import { memo } from 'react';
import { NodeProps, Position } from 'reactflow';
import BaseNode from '@/components/Nodes/BaseNode';
import Handle from '@/components/Nodes/Handle';

function SourceNode({ data, id, selected }: NodeProps) {
    return (
        <>
            <BaseNode data={data} id={id} selected={selected} />

            <Handle
                type="source"
                variant="output"
                position={Position.Right}
                nodeid={id}
                id={`${id}_output`}
            />
        </>
    );
}
export default memo(SourceNode);
