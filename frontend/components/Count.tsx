import { Typography } from "@mui/material";

export default function Count({loading=false, count}) {
return (
    <Typography sx={{ width: "100%" }} align="center" variant="caption">
      Number of results: {loading ? "loading..." : `${count}`}
    </Typography>
)
}
    