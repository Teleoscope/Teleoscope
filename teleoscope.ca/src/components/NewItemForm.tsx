import { TextField, Stack } from '@mui/material';
import { useAppSelector } from '@/lib/hooks';

export function NewItemForm({ label, HandleSubmit, icon = null }) {
    const settings = useAppSelector(
        (state) => state.appState.workflow.settings
    );

    const keyChange = (e) => {
        if (e.code == 'Enter') {
            HandleSubmit(e);
        }
    };

    return (
        <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            style={{ margin: 0 }}
        >
            <TextField
                label={label}
                placeholder="Type label and press enter."
                variant="standard"
                onKeyDown={keyChange}
                InputLabelProps={{
                    sx: {
                        '&.Mui-focused': {
                            color: settings.color
                        }
                    }
                }}
                sx={{
                    width: '100%',
                    margin: 1,
                    '& .MuiInput-underline:after': {
                        borderBottomColor: settings.color
                    }
                }}
            />
        </Stack>
    );
}
