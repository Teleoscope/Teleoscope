import { useState } from 'react';
import { TextField, Button, FormControl, InputLabel, Select, MenuItem, Stack } from '@mui/material';
import { signIn } from "next-auth/react";

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('');

  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleDatabaseChange = (event) => {
    setDatabase(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Handle form submission here, e.g., send data to backend
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('Database:', database);
  };

  return (
    <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
        <InputLabel id="username-label">Username</InputLabel>

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

      <InputLabel id="database-select-label">Database</InputLabel>
        <Select
          labelId="database-select-label"
          value={database}
          onChange={handleDatabaseChange}
          required
          fullWidth
        >
          <MenuItem value="aita">r/AmITheAsshole</MenuItem>
          <MenuItem value="nursing">r/nursing</MenuItem>
        </Select>

      <FormControl fullWidth>
        

      </FormControl>
      </Stack>

      <Button 
      onClick={() => signIn("credentials", {
        callbackUrl:`${database}${process.env.NEXT_PUBLIC_FRONTEND_HOST}`,
        username: username,
        password: password,
        database: database
    })}
      type="submit" variant="contained" color="primary">
        Submit
      </Button>
    </form>
  );
};

export default LoginForm;
