import React, { useContext } from "react";

// material ui
import { Menu, MenuItem, Stack, Typography } from "@mui/material";

import { AccountCircle } from "@mui/icons-material";
import { Divider, IconButton } from "@mui/material";

// components
import Account from "@/components/Account";

// actions
import { sessionActivator, setUserId } from "@/actions/activeSessionID";
import { setDefault } from "@/actions/windows";
import { useDispatch, useSelector } from "react-redux";

// utilities
import { swrContext } from "@/util/swr";
import { useCookies } from "react-cookie";

// contexts
import { StompContext } from "@/components/Stomp";

export default function TopBar(props) {
  const [cookies, setCookie] = useCookies(["userid"]);
  const settings = useSelector((state) => state.windows.settings);
  const userid = useSelector((state) => state.activeSessionID.userid);
  const dispatch = useDispatch();
  const client = useContext(StompContext);
  const swr = useContext(swrContext);
  const { user } = swr.useSWRAbstract("user", `users/${userid}`);

  const handleSignOut = () => {
    setCookie("userid", -1, {
      path: "/",
    });
    dispatch(sessionActivator(-1));
    dispatch(setUserId(-1));
    client.userId = -1;
    dispatch(setDefault());
  };

  const handleSignIn = (user) => {
    setCookie("userid", user._id, {
      path: "/",
    });
    dispatch(setUserId(user._id));
    dispatch(sessionActivator(user.sessions[0]));
    client.restart({userid: user._id, database: client.database})
  };

  const AccountMenu = () => {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [openMenu, setOpenMenu] = React.useState(false);

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
              {user ? user.username : "Not signed in"}
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
          <MenuItem
            onKeyDown={(e) => e.stopPropagation()}
            children={
              <Account
                user={user}
                handleSignIn={handleSignIn}
                handleSignOut={handleSignOut}
                client={client}
              />
            }
          ></MenuItem>
          <Divider></Divider>
          <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
        </Menu>
      </Stack>
    );
  };

  // Main return for this component
  return <AccountMenu />;
}
