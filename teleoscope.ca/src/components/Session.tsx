import { Button, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { alpha } from "@mui/material";
import randomColor from "randomcolor";
import { uniqueNamesGenerator, adjectives, colors, animals } from "unique-names-generator";
import { useAppDispatch } from "@/lib/hooks";
import { initializeWorkflow } from "@/actions/appState";

export default function Session({ sessions, user, users, workflow_id, handleSessionChange }) {
  const dispatch = useAppDispatch();
  const randomName = uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    length: 1,
  });

  const getSessions = (username) => {
    if (sessions && users) {
      for (const i in users) {
        const user = users[i];
        if (user["username"] === username && user["sessions"].length > 0) {
          return user["sessions"].map((s) => {
            const temp = sessions.find((ss) => ss._id === s);
            return (
              <MenuItem key={s._id} value={s}>
                {temp?.history[0].label}
              </MenuItem>
            );
          });
        }
      }
    }
    return <MenuItem value={null}>No sessions for this user...</MenuItem>;
  };

  const handleNewSession = () => {
    dispatch(initializeWorkflow({
      label: randomName,
      color: randomColor({
        luminosity: "dark",
        hue: "random",
      })
    }));
  };

  return (
    <FormControl
      sx={{ width: "100%", backgroundColor: alpha("#FFFFFF", 0.0) }}
      variant="filled"
    >
      <InputLabel id="demo-simple-select-label">Session</InputLabel>
      <Select
        labelId="demo-simple-select-label"
        id="demo-simple-select"
        value={workflow_id}
        label="Workflow ID"
        size="small"
        onChange={(event) => handleSessionChange(event.target.value)}
      >
        {getSessions(user?.username)}
        <Button
          size="small"
          variant="text"
          onClick={handleNewSession}
          style={{
            backgroundColor: "#FFFFFF",
            color: "black",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          New session
        </Button>
      </Select>
    </FormControl>
  );
}
