import { useAppSelector } from "@/lib/hooks";
import { RootState } from "@/lib/store";

// MUI imports
import Typography from "@mui/material/Typography";

export default function DocumentTitle({size, color, noWrap, title}) {
  const settings = useAppSelector((state: RootState) => state.appState.workflow.settings);
  const sliced = title ? title.slice(0, settings.default_title_length) : ""
  const display = title.length > sliced.length ? sliced + "..." : title

  return (
    <Typography
      variant={size == "small" ? "caption" : "subtitle"}
      color={color ? color : "black"}
      noWrap={noWrap}
    >
      {display}
    </Typography>
  );
}
