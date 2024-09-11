import dynamic from 'next/dynamic';
import { useState } from 'react';
import _ from 'lodash';
import axios from 'axios';
import { useAppSelector } from '@/lib/hooks';
import { Button, Divider, Stack } from '@mui/material';
import { useSWRF } from '@/lib/swr';
import DataViewer from './Sidebar/DataViewer';
import { mutate } from 'swr';

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
            description: 'The title of the document that you want searched.',
            suggested_mappings: ['title']
        },
        {
            name: 'Group',
            key: 'group',
            description: 'Any existing groups that you want created.',
            suggested_mappings: ['group']
        },
        {
            name: 'Unique ID',
            key: 'uid',
            description: 'Any existing unique IDs that you want used.',
            suggested_mappings: [
                'uid',
                'id',
                '_id',
                'unique_id',
                'metadata.uid',
                'metadata.id'
            ]
        },
        {
            name: 'Date Created',
            key: 'date_created',
            description: 'The date when the document was created.',
            suggested_mappings: ['created_at', 'date', 'creation_date']
        },
        {
            name: 'Last Modified',
            key: 'last_modified',
            description: 'The date when the document was last modified.',
            suggested_mappings: ['modified_at', 'last_updated', 'updated_at']
        },
        {
            name: 'Author',
            key: 'author',
            description: 'The name of the document author or creator.',
            suggested_mappings: ['creator', 'owner', 'document_author']
        },
        {
            name: 'Tags',
            key: 'tags',
            description: 'Any tags or keywords associated with the document.',
            suggested_mappings: ['keywords', 'labels', 'categories']
        },
        {
            name: 'Document Type',
            key: 'document_type',
            description: 'The type or format of the document (e.g., PDF, Word).',
            suggested_mappings: ['type', 'format', 'document_format']
        },
        {
            name: 'Language',
            key: 'language',
            description: 'The language in which the document is written.',
            suggested_mappings: ['lang', 'document_language']
        },
        {
            name: 'File Size',
            key: 'file_size',
            description: 'The size of the document in bytes or human-readable format.',
            suggested_mappings: ['size', 'document_size']
        },
        {
            name: 'Document Version',
            key: 'version',
            description: 'The version number of the document, if applicable.',
            suggested_mappings: ['version_number', 'document_version']
        },
        {
            name: 'Link',
            key: 'link',
            description: 'The link for the document.',
            suggested_mappings: ['link', 'url']
        },
        {
            name: 'Category',
            key: 'category',
            description: 'The category for the document.',
            suggested_mappings: ['category']
        },
        {
            name: 'Metadata 1',
            key: 'm1',
            description: 'Arbitrary metadata.',
            suggested_mappings: ['metadata_1', 'custom_field_1']
        },
        {
            name: 'Metadata 2',
            key: 'm2',
            description: 'Arbitrary metadata.',
            suggested_mappings: ['metadata_2', 'custom_field_2']
        },
        {
            name: 'Metadata 3',
            key: 'm3',
            description: 'Arbitrary metadata.',
            suggested_mappings: ['metadata_3', 'custom_field_3']
        },
        {
            name: 'Metadata 4',
            key: 'm4',
            description: 'Arbitrary metadata.',
            suggested_mappings: ['metadata_4', 'custom_field_4']
        },
        {
            name: 'Metadata 5',
            key: 'm5',
            description: 'Arbitrary metadata.',
            suggested_mappings: ['metadata_5', 'custom_field_5']
        },
        {
            name: 'Metadata 6',
            key: 'm6',
            description: 'Arbitrary metadata.',
            suggested_mappings: ['metadata_6', 'custom_field_6']
        },
        {
            name: 'Metadata 7',
            key: 'm7',
            description: 'Arbitrary metadata.',
            suggested_mappings: ['metadata_7', 'custom_field_7']
        },
        {
            name: 'Metadata 8',
            key: 'm8',
            description: 'Arbitrary metadata.',
            suggested_mappings: ['metadata_8', 'custom_field_8']
        },
        {
            name: 'Metadata 9',
            key: 'm9',
            description: 'Arbitrary metadata.',
            suggested_mappings: ['metadata_9', 'custom_field_9']
        },
        {
            name: 'Metadata 10',
            key: 'm10',
            description: 'Arbitrary metadata.',
            suggested_mappings: ['metadata_10', 'custom_field_10']
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
    const { color } = useAppSelector((state) => state.appState.workflow.settings);

    const handleComplete = (data) => {
        if (!data.error) {
            const chunkSize = 1000;
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
                }).then(()=>{
                    setTimeout(()=>{
                        mutate((key) =>
                            typeof key === 'string' && key.startsWith(`/api/app`))
                    },1000);
                    })
                    
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
                <Button color={color} onClick={() => handleOpenImporter()}>
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
