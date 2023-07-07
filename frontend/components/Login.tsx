import { useState } from 'react';
import { TextField, Button, FormControl, InputLabel, Stack } from '@mui/material';
import { signIn } from "next-auth/react";

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [exists, setExists] = useState(false);
  const [checked, setChecked] = useState(false);

  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
    
    fetch(`https://${process.env.NEXT_PUBLIC_FRONTEND_HOST}/api/users/${username}`)
    .then(resp => {
        if (event.target.value.length == 0) {
            setChecked(false);    
            setExists(false);
        }
        console.log("username", event.target.value, resp)
        setChecked(true);
        setExists(resp);
    })

    
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };



  const handleSubmit = (event) => {
    event.preventDefault();
    // Handle form submission here, e.g., send data to backend
    // console.log('Username:', username);
    // console.log('Password:', password);
  };

  return (
    <Stack>

    <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
        <InputLabel id="username-label">
            Username {
                !checked ? <></> : exists ? <span>Username already exists...</span> : <></>}
        </InputLabel>

      <TextField
        value={username}
        onChange={handleUsernameChange}
        fullWidth
        required
      />

    <InputLabel id="password-label">Password</InputLabel>
      <TextField
        type="password"
        value={password}
        onChange={handlePasswordChange}
        fullWidth
        required
      />

      <FormControl fullWidth>
      </FormControl>
      </Stack>

      <Button 
      onClick={() => signIn("credentials", {
        callbackUrl:`https://${process.env.NEXT_PUBLIC_FRONTEND_HOST}/dashboard`,
        username: username,
        password: password,
    })}
      type="submit" variant="contained" color="primary">
        Submit
      </Button>
    </form>
    </Stack>
  );
};

export default LoginForm;
