import React from "react";
import { CompactPicker } from "react-color";

export default function ColorPicker({ defaultColor, onChange }) {
  const [state, setState] = React.useState({
    background: defaultColor,
  });

  const handleChangeComplete = (color) => {
    setState({ background: color.hex });
    onChange(color.hex);
  };

  return (
    <div style={{ padding: "1em" }}>
      <CompactPicker
        color={state.background}
        onChangeComplete={handleChangeComplete}
      />
    </div>
  );
}
