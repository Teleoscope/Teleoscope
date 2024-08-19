import { Typography } from "@mui/material";

export default function Count({loading=false, label, count}) {
return (
    <Typography sx={{ width: "100%" }} align="center" variant="caption">
      {label}: {loading ? "loading..." : `${count}`}
    </Typography>
)
}