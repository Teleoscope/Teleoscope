import React from 'react';

// material ui
import { Menu, MenuItem, Stack, Typography } from '@mui/material';

import { AccountCircle } from '@mui/icons-material';
import { IconButton } from '@mui/material';

import LogoutIcon from '@mui/icons-material/Logout';
import Link from 'next/link';
import { useAppSelector } from '@/lib/hooks';
import { useSWRF } from '@/lib/swr';
import { Users } from '@/types/users';

const Team = ({ oid }: { oid: string }) => {
    const { data: team } = useSWRF(oid && typeof oid === 'string' && oid != "null" ? `/api/team?team=${oid}` : null);
    return <>{team ? team.label : 'Team loading...'}</>;
};

const User = () => {
    const { data: user } : {data: Users} = useSWRF(`/api/user`);
    return <Typography noWrap>{user ? user.emails[0] : 'Not signed in'}</Typography>;
};

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
    const settings = {
        color: '#FF0000'
    };
    // const settings = useSelector((state) => state.appState.workflow.settings);
    const AccountMenu = () => {
        const [anchorEl, setAnchorEl] = React.useState(null);
        const [openMenu, setOpenMenu] = React.useState(false);
        const { workflow, workspace } = useAppSelector(
            (state) => state.appState
        );

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

                        {compact ? '' : <User />}
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
                            <Link href={'auth/signin'}>
                                <LogoutIcon sx={{ marginRight: '0.5em' }} />
                                Sign out
                            </Link>
                        </MenuItem>
                    </Menu>
                </Stack>
                <Typography>{label}</Typography>
                <Typography>
                    <Team oid={team}></Team>
                </Typography>
                {/* <Typography>Workflow: {workflow._id}</Typography>
                <Typography>Clock count: {workflow.logical_clock}</Typography> */}
            </Stack>
        );
    };

    // Main return for this component
    return <AccountMenu />;
}
