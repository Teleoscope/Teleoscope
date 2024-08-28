import dynamic from 'next/dynamic';
import { useState } from 'react';
import _ from 'lodash';
import axios from 'axios';
import { useAppSelector } from '@/lib/hooks';
import { Button, Divider, Stack } from '@mui/material';
import { useSWRF } from '@/lib/swr';
import DataViewer from './Sidebar/DataViewer';

// Adjust dynamic import based on the export type
const CSVImporter = dynamic(
    () => import('csv-upload').then((mod) => mod.CSVImporter),
    { ssr: false }
);

const template = {
    columns: [
        {
            name: 'Text',
            key: 'text',
            required: true,
            description: 'The text that you want searched.',
            suggested_mappings: ['text']
        },
        {
            name: 'Title',
            key: 'title',
            required: true,
            description: 'The title of the document that you want searched.',
            suggested_mappings: ['title']
        },
        {
            name: 'Groups',
            key: 'group',
            description: 'Any existing groups that you want created.',
            suggested_mappings: ['group']
        },
        {
            name: 'Unique IDs',
            key: 'uid',
            description: 'Any existing unique IDs that you want used.',
            suggested_mappings: [
                'uid',
                'id',
                '_id',
                'unique_id',
                'metadata.uid'
            ]
        }
    ]
};

function StorageItem({ oid }) {
    const { data: storage } = useSWRF(oid ? `/api/storage?storage=${oid}`: null);
    return <DataViewer id={oid} type="Storage"></DataViewer>
        
}

export default function UploadPage() {
    const [isOpen, setIsOpen] = useState(false);
    const [label, setLabel] = useState('');

    const { _id: workspace_id } = useAppSelector(
        (state) => state.appState.workspace
    );

    const { storage } = useAppSelector((state) => state.appState.workspace);

    const handleComplete = (data) => {
        if (!data.error) {
            const chunkSize = 10000;
            const chunks = _.chunk(data.rows, chunkSize);
            chunks.forEach((chunk) => {
                const formatted_chunk = {
                    columns: data.columns,
                    error: data.error,
                    num_columns: data.num_columns,
                    num_rows: chunk.length,
                    rows: chunk
                };
                axios.post(`/api/upload/csv/chunk`, {
                    workspace_id: workspace_id,
                    data: formatted_chunk,
                    label: label
                });
            });
        }
    };
    const handleOpenImporter = () => {
        setIsOpen(true);
        const date = new Date();
        const formattedDate = date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        });
        setLabel(formattedDate);
    };

    return (
        <>
            <Stack direction="column" justifyContent="space-between">
                <Button onClick={() => handleOpenImporter()}>
                    Open CSV Importer
                </Button>
                {typeof window !== 'undefined' && (
                    <CSVImporter
                        isModal={true}
                        modalIsOpen={isOpen}
                        darkMode={false}
                        template={template}
                        modalOnCloseTriggered={() => setIsOpen(false)}
                        modalCloseOnOutsideClick={true}
                        onComplete={handleComplete}
                    />
                )}
                <Divider></Divider>
                {storage?.map((s) => {
                    return <StorageItem oid={s} key={s} />;
                })}
            </Stack>
        </>
    );
}
