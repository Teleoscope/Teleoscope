import { memo } from 'react';
import BaseNode from '@/components/Nodes/BaseNode';
import { NodeProps } from 'reactflow';

function WindowNode({ data, id, selected }: NodeProps) {
    return <BaseNode data={data} id={id} selected={selected} />;
}

export default memo(WindowNode);
