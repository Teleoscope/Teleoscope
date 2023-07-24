import { useState } from 'react';
import { TextField, Button, InputLabel, Stack } from '@mui/material';
import { signIn, useSession } from "next-auth/react";
import { useRouter } from 'next/router';




const LoginForm = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  if (session && status === "authenticated") {
    router.push('/dashboard')
  }

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');



  const validateUsername = () => {
    setUsernameError("")

    fetch(`https://${process.env.NEXT_PUBLIC_FRONTEND_HOST}/api/users/${event.target.value}`)
    .then(resp => {
        return resp.json()
    }).then(data => {
      if (data.found) {
        setUsernameError('Username already exists.');
      }
    })

    const username_length = 3
    // Username validation logic
    if (username.length < username_length) {
      setUsernameError(`Username must be at least ${username_length} characters long.`);
    } 
    else if (username.includes(' ')) {
      setUsernameError('Username cannot contain spaces.');
    }
    else {
      setUsernameError('');
    }
  }
   
  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
    validateUsername()    
  };

  const validatePassword = (pw) => {
    // Password validation logic
    if (pw.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
    } 
    else if (pw.includes(' ')) {
        setPasswordError('Password cannot contain spaces.');
      
    }
    else {
      setPasswordError('');
    }
  };


  const handleKeyDown = (event) => {
    if ((event.key === 'Return' || event.key === 'Enter' || event.keyCode === 13) && !passwordError) {
      handleSubmit(event)
    }
  }

  const handlePasswordChange = (event) => {
    setPassword(event.target.value)
    validatePassword(event.target.value)
    
  };

  const handleSubmit = (event) => {
    if (!passwordError) {
     signIn("credentials", {
      redirect: false,
      username: username,
      password: password
    }).then(response => {
      if (response?.ok) {
        router.push('/dashboard')
      }
    }) 
    }
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
        onBlur={validateUsername}
        error={!!usernameError}
        helperText={usernameError}
        onKeyDown={handleKeyDown}
      />

    <InputLabel id="password-label">Password</InputLabel>
      <TextField
        type="password"
        label="Password"
        value={password}
        onInput={handlePasswordChange}
        onBlur={() => validatePassword(password)}
        error={!!passwordError}
        helperText={passwordError}
        onKeyDown={handleKeyDown}
        required
      />

      <Button onClick={handleSubmit} color="primary">
        {usernameError == 'Username already exists.' ? "Sign in" : "Create new user"}
      </Button> 
      </Stack>
      </form>
  );
};

export default LoginForm;
