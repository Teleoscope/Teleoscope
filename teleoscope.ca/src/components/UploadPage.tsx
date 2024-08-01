import { useState } from 'react';
import { CSVImporter } from 'csv-upload';
import _ from 'lodash';
import axios from 'axios';
import { useAppSelector } from '@/lib/hooks';

const template = {
    columns: [
        {
            name: 'Text',
            key: 'text',
            required: true,
            description: 'The text that you want searched.',
            suggested_mappings: ['text', 'document']
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
            suggested_mappings: ['uid', 'id', '_id', 'unique_id']
        }
    ]
};

export default function UploadPage() {
    const [isOpen, setIsOpen] = useState(false);
    const {_id: workspace_id } = useAppSelector((state) => state.appState.workspace);
    
    const handleComplete = (data) => {
        console.log("data", data)
        if (!data.error) {
            const chunkSize = 10000;
            const chunks = _.chunk(data.rows, chunkSize);
            chunks.forEach(chunk => {
                const formatted_chunk = {
                    columns: data.columns,
                    error: data.error,
                    num_columns: data.num_columns,
                    num_rows: chunk.length,
                    rows: chunk
                }
                axios.post(`/api/upload/csv/chunk`, {
                    workspace_id: workspace_id,
                    data: formatted_chunk
                })
            })            
        }
    }


    return (
        <>
            <button onClick={() => setIsOpen(true)}>Open CSV Importer</button>

            <CSVImporter
                isModal={true}
                modalIsOpen={isOpen}
                darkMode={false}
                template={template}
                modalOnCloseTriggered={() => setIsOpen(false)}
                modalCloseOnOutsideClick={true}
                // papaParseConfig={{ preview: 15 }}
                onComplete={handleComplete}
            />
        </>
    );
}