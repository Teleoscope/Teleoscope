// mui
import { Typography, Box } from '@mui/material';
import Highlighter from '../Highlighter';

export default function DocumentText({ text }: { text: string }) {
    return (
        <Box sx={{ height: '100%', overflow: 'auto' }}>
            <Typography
                variant="body2"
                sx={{ margin: '1em', userSelect: 'text' }}
            >
                <Highlighter>{text}</Highlighter>
            </Typography>
        </Box>
    );
}
