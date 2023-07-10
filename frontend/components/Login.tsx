import { useState } from 'react';
import { TextField, Button, InputLabel, Stack } from '@mui/material';
import { signIn, useSession } from "next-auth/react";
import { useRouter } from 'next/router';

const LoginForm = () => {
  const router = useRouter()

  const { data: session, status } = useSession()
  
  if (session && status === "authenticated") {
    router.push('/dashboard')
  }

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [exists, setExists] = useState(false);

  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
    
    fetch(`https://${process.env.NEXT_PUBLIC_FRONTEND_HOST}/api/users/${event.target.value}`)
    .then(resp => {
        return resp.json()  
    }).then(data => {
      setExists(data.found);
    })
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleSubmit = (event) => {
    signIn("credentials", {
      redirect: false,
      username: username,
      password: password
    }).then(response => {
      console.log("response", response)
      if (response.ok) {
        router.push('/dashboard')
      }
    })
    
  };



  return (
<form>
        <Stack spacing={2}>
        <InputLabel id="username-label">
            Username
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

      <Button onClick={handleSubmit} color="primary">
        {exists ? "Sign in" : "Create new user"}
      </Button> 
      </Stack>
      </form>
  );
};

export default LoginForm;
