import React, { useContext } from "react";

// MUI
import { Link } from "@mui/material";
import { Flare } from "@mui/icons-material";
import { Stack } from "@mui/material";
import { useAppSelector, useAppDispatch } from "@/util/hooks";

export default function TeleoscopeLogo(props) {
  const color = useAppSelector((state) => state.windows.color);

  return (
    <Stack direction={props.compact ? "column" : "row"} alignItems="center">
      <Flare
        sx={{
          color: props.color,
          marginRight: "0.33em",
          "&:hover": {
            color: color,
          },
        }}
      />
      <Link
        href="http://github.com/Teleoscope/Teleoscope"
        underline="hover"
        sx={{
          fontWeight: "fontWeightLight",
          fontFamily: "monospace",
          color: props.color,
          textDecorationColor: props.color,
          "&:hover": {
            color: props.hoverColor ? props.hoverColor : color,
            textDecorationColor: props.textDecorationColor
              ? props.textDecorationColor
              : color,
          },
        }}
      >
        {props.compact ? "" : "Teleoscope"}
      </Link>
    </Stack>
  );
}
