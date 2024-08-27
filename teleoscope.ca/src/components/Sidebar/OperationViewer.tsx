import withDataViewer from './withDataViewer';
import { useSWRF } from '@/lib/swr';

const getDataForOperationViewer = (id) => {
    const { data: operation } = useSWRF(`/api/graph?uid=${id}`);
    return {
        doclists: operation?.doclists,
        label: operation?.type // or use something else relevant
    };
};

const OperationViewer = withDataViewer(
    (props) => <div />,
    getDataForOperationViewer,
    (type) => type
);

export default OperationViewer;
