import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { alpha } from "@mui/material";
import randomColor from "randomcolor";
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";

export default function Session(props) {
  const randomName = uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    length: 1,
  });

  const getSessions = (username) => {
    if (props.sessions && props.users) {
      for (const i in props.users) {
        const user = props.users[i];
        if (user["username"] === username && user["sessions"].length > 0) {
          return user["sessions"].map((s) => {
            const temp = props.sessions.find((ss) => ss._id === s);
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
    props.client.initialize_workflow(
      randomName,
      randomColor({
        luminosity: "dark",
        hue: "random",
      })
    );
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
        value={props.session_id}
        label="Session ID"
        size="small"
        onChange={(event) => props.handleSessionChange(event.target.value)}
      >
        {getSessions(props.user?.username)}
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
