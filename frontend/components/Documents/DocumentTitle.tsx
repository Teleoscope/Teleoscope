import { useAppSelector } from "@/util/hooks";
import { RootState } from "@/stores/store";

// MUI imports
import Typography from "@mui/material/Typography";

// fonts
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

export default function DocumentTitle({size, color, noWrap, title}) {
  const settings = useAppSelector((state: RootState) => state.windows.settings);
  const sliced = title ? title.slice(0, settings.default_title_length) : ""
  const display = title.length >= sliced.length ? sliced + "..." : title

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
