import React, { useContext } from "react";
import { Button, Stack, TextField } from "@mui/material";
import { InputAdornment } from "@mui/material";
import { alpha } from "@mui/material";
import { swrContext } from "@/util/swr";
import { AccountCircle } from "@mui/icons-material";

export default function Account(props) {
  const swr = useContext(swrContext);

  const [value, setValue] = React.useState("");
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleEnterUser(value);
    } else {
      setValue(e.target.value);
    }
  };

  // http://nursing.localhost:3000/api/nursing/user/paul

  const handleTimeOut = (username) => {
    fetch(
      `http://${swr.subdomain}.${process.env.NEXT_PUBLIC_FRONTEND_HOST}/api/${swr.subdomain}/user/${username}`
    )
      .then((response) => response.json())
      .then((user) => {
        if (user != null) {
          props.handleSignIn(user);
        } else {
          props.handleSignOut();
        }
      });
  };

  // Helper functions
  const handleEnterUser = (username) => {
    if (!username) {
      return;
    }
    const url = `http://${swr.subdomain}.${process.env.NEXT_PUBLIC_FRONTEND_HOST}/api/${swr.subdomain}/user/${username}`;

    fetch(url)
      .then((response) => response.json())
      .then((user) => {
        if (user != null) {
          props.handleSignIn(user);
        } else {
          props.client.register_account(value, "password", swr.database);
          setTimeout(() => handleTimeOut(username), 2000);
        }
      });
  };

  return (
    <Stack direction="row" spacing={1}>
      <TextField
        id="input-with-icon-textfield"
        sx={{ width: "75%", backgroundColor: alpha("#FFFFFF", 0.0) }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <AccountCircle />
            </InputAdornment>
          ),
        }}
        label="Username"
        variant="standard"
        defaultValue={props.user?.username}
        onKeyUp={(e) => handleKeyPress(e)}
      />
      <Button onClick={() => handleEnterUser(value)}>Sign in</Button>
    </Stack>
  );
}
