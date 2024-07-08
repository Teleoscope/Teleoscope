import React from 'react';

// material ui
import { Menu, MenuItem, Stack, Typography } from '@mui/material';

import { AccountCircle } from '@mui/icons-material';
import { IconButton } from '@mui/material';

import LogoutIcon from '@mui/icons-material/Logout';
import { useUserContext } from '@/context/UserContext';
import Link from 'next/link';

export default function TopBar({
    compact,
    label,
    team,
    color
}: {
    compact: boolean;
    label: string;
    team: string;
    color: string;
}) {
    const { userId } = useUserContext();

    const settings = {
        color: '#FF0000'
    };
    // const settings = useSelector((state) => state.appState.workflow.settings);
    const AccountMenu = () => {
        const [anchorEl, setAnchorEl] = React.useState(null);
        const [openMenu, setOpenMenu] = React.useState(false);

        return (
            <Stack spacing={1} direction="column" alignItems="center">
                <Stack spacing={1} direction="row-reverse" alignItems="center">
                    <Stack spacing={0} direction="row" alignItems="center">
                        <IconButton
                            id="bIconasic-button"
                            onClick={(event) => {
                                setAnchorEl(event.currentTarget);
                                setOpenMenu(true);
                            }}
                        >
                            <AccountCircle
                                sx={{ color: color }}
                            ></AccountCircle>
                        </IconButton>

                        {compact ? (
                            ''
                        ) : (
                            <Typography
                                noWrap
                                onClick={(event) => {
                                    setAnchorEl(event.currentTarget);
                                    setOpenMenu(true);
                                }}
                            >
                                {userId ? userId : 'Not signed in'}
                            </Typography>
                        )}
                    </Stack>

                    <Menu
                        id="basic-menu"
                        anchorEl={anchorEl}
                        open={openMenu}
                        onClose={() => {
                            setAnchorEl(null);
                            setOpenMenu(false);
                        }}
                    >
                        {/* <MenuItem>
                            <Link href={'/dashboard'}>
                                <DashboardIcon sx={{ marginRight: '0.5em' }} />
                                Go to Dashboard
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <Link href={'/resources'}>
                                <InfoIcon sx={{ marginRight: '0.5em' }} />
                                Go to Resources
                            </Link>
                        </MenuItem>

                        <Divider /> */}
                        <MenuItem>
                            <Link href={'/signout'}>
                                <LogoutIcon sx={{ marginRight: '0.5em' }} />
                                Sign out
                            </Link>
                        </MenuItem>
                    </Menu>
                </Stack>
                <Typography>{label}</Typography>
                <Typography>{team}</Typography>
            </Stack>
        );
    };

    // Main return for this component
    return <AccountMenu />;
}
