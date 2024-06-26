// mui
import { Typography, Box } from "@mui/material";
import Highlighter from "../Highlighter";

export default function DocumentText(props) {
  return (
    <Box sx={{ height: "100%", overflow: "auto" }}>
      <Typography
        variant="body2"
        sx={{ margin: "1em", userSelect: "text" }}

      >
        <Highlighter>{props.text}</Highlighter>
      </Typography>
    </Box>
  );
}
