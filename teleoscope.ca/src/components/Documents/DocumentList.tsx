import { useAppDispatch } from '@/lib/hooks';

// material ui
import LoadingButton from '@mui/lab/LoadingButton';

// custom components
import DocumentListItem from '@/components/Documents/DocumentListItem';
import ItemList from '@/components/ItemList';
import { mark, setSelection } from '@/actions/appState';

export default function DocumentList({
    data,
    group,
    loading,
    loadMore,
    ...props
}) {
    const dispatch = useAppDispatch();
    if (loading) {
        return <LoadingButton></LoadingButton>;
    }

    const renderItem = (index, item, currentIndex, setIndex) => {
        if (!item) {
            return <>Document Loading...</>;
        }
        return (
            <DocumentListItem
                showReadIcon={true}
                setIndex={setIndex}
                listIndex={index}
                group={group}
                highlight={index == currentIndex}
                id={item[0]}
                key={item[0] + 'DocumentListItem'}
                {...props}
            />
        );
    };

    const onSelect = (doc) => {
        if (doc) {
            dispatch(
                setSelection({
                    nodes: [{ id: doc[0], data: { type: 'Document' } }],
                    edges: []
                })
            );
            dispatch(mark({ document_id: doc[0], read: true }));
        }
    };

    const handleLoadMore = () => {
        if (loadMore) {
            loadMore();
        }
    };

    return (
        <ItemList
            data={data}
            render={renderItem}
            loadMore={handleLoadMore}
            onSelect={onSelect}
        ></ItemList>
    );
}
