import React from "react";

// material ui
import { Menu, MenuItem, Stack, Typography } from "@mui/material";

import { AccountCircle } from "@mui/icons-material";
import { IconButton } from "@mui/material";

import { useSelector } from "react-redux";

import { signOut, useSession } from "next-auth/react";

export default function TopBar(props) {
  const settings = useSelector((state) => state.windows.settings);
  const { data: session, status } = useSession();
  
  const AccountMenu = () => {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [openMenu, setOpenMenu] = React.useState(false);
    const handleSignOut = () => {
      signOut({ callbackUrl: `${process.env.NEXT_PUBLIC_NEXTAUTH_URL}/signin` })
    }
    return (
      <Stack spacing={1} direction="row-reverse">
        <Stack spacing={0} direction="row" alignItems="center">
          <IconButton
            id="bIconasic-button"
            onClick={(event) => {
              setAnchorEl(event.currentTarget);
              setOpenMenu(true);
            }}
          >
            <AccountCircle sx={{ color: settings.color }}></AccountCircle>

          </IconButton>

          {props.compact ? (
            ""
          ) : (
            <Typography
              noWrap
              onClick={(event) => {
                setAnchorEl(event.currentTarget);
                setOpenMenu(true);
              }}
            >
              {session.user ? session.user.username : "Not signed in"}
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
          <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
        </Menu>
      </Stack>
    );
  };

  // Main return for this component
  return <AccountMenu />;
}
