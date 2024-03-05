import { useState, useEffect } from 'react';
import { TextField, Button, InputLabel, Stack } from '@mui/material';
import { signIn, useSession } from "next-auth/react";
import { useRouter } from 'next/router';

const LoginForm = () => { // Assuming frontendHost is passed as a prop
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session && status === "authenticated") {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');

  // Inside your LoginForm component
const validateUsername = async (username) => {
  setUsernameError("");

  // Use window.location to determine the host dynamically
  const protocol = window.location.protocol;
  const host = window.location.host; // Includes hostname and port if applicable

  try {
    const response = await fetch(`${protocol}//${host}/api/users/${username}`);
    const data = await response.json();
    if (data.found) {
      setUsernameError('Username already exists.');
    }
  } catch (error) {
    console.error("Failed to validate username:", error);
  }
};

  
  const handleUsernameChange = (event) => {
    const newUsername = event.target.value;
    setUsername(newUsername);
    validateUsername(newUsername);
  };

  const validatePassword = (pw) => {
    setPasswordError('');
    if (pw.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
    } else if (pw.includes(' ')) {
      setPasswordError('Password cannot contain spaces.');
    }
  };

  const handlePasswordChange = (event) => {
    const newPw = event.target.value;
    setPassword(newPw);
    validatePassword(newPw);
  };

  const handleSubmit = async (event) => {
    
    event.preventDefault(); // Prevent form submission
    if (!passwordError && password && username) {
      const response = await signIn("credentials", {
        redirect: false,
        username,
        password
      });
      if (response?.ok) {
        router.push('/dashboard');
      } else {
        console.log(response)
      }
    } 
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <InputLabel id="username-label">Username</InputLabel>
        <TextField
          value={username}
          onChange={handleUsernameChange}
          onBlur={() => validateUsername(username)}
          error={!!usernameError}
          helperText={usernameError}
          required
        />
        <InputLabel id="password-label">Password</InputLabel>
        <TextField
          type="password"
          value={password}
          onChange={handlePasswordChange}
          onBlur={() => validatePassword(password)}
          error={!!passwordError}
          helperText={passwordError}
          required
        />
        <Button type="submit" color="primary">
          {usernameError === 'Username already exists.' ? "Sign in" : "Create new user"}
        </Button> 
      </Stack>
    </form>
  );
};

export default LoginForm;
