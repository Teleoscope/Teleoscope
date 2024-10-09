import { IconButton, Tooltip } from '@mui/material';
import { Diversity2 as Diversity2Icon } from '@mui/icons-material';

import { BsFiletypeDocx } from 'react-icons/bs';
import { BsFiletypeXlsx } from 'react-icons/bs';
import { useAppSelector } from '@/lib/hooks';
import axios from 'axios';

// Button Action Functions
export const SaveDocxAction = (props) => {
    const { _id } = useAppSelector((state) => state.appState.workspace);
    const createDocx = async () => {
        const groups = await axios.get(`/api/groups?workspace=${_id}&ids=true`).then((res) => {
            return res.data;
        });
        await axios.post(`/api/download/prepare/docx`, {
            workspace_id: _id,
            group_ids: groups,
            storage_ids: []
        });
    };

    return (
        <Tooltip title="Download as Docx" key="Download as Docx">
            <IconButton onClick={createDocx}>
                <BsFiletypeDocx fontSize="small" />
            </IconButton>
        </Tooltip>
    );
};

// Button Action Functions
export const SaveXLSXAction = (props) => {
    const { _id } = useAppSelector((state) => state.appState.workspace);
    const createXLSX = async () => {
        const groups = await axios.get(`/api/groups?workspace=${_id}&ids=true`).then((res) => {
            return res.data;
        });
        
        await axios.post(`/api/download/prepare/xlsx`, {
            workspace_id: _id,
            group_ids: groups,
            storage_ids: []
        });
    };
    return (
        <Tooltip title="Download as XLSX" key="Download as XLSX">
            <IconButton onClick={createXLSX}>
                <BsFiletypeXlsx fontSize="small" />
            </IconButton>
        </Tooltip>
    );
};

export const ClusterButtonAction = (props) => {
    const { runClusters } = props;

    return (
        <Tooltip title="Cluster on existing groups">
            <IconButton onClick={runClusters}>
                <Diversity2Icon fontSize="small" />
            </IconButton>
        </Tooltip>
    );
};
