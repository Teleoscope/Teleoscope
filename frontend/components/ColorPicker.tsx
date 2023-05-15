import React from "react";
import { CompactPicker } from "react-color";

export default function ColorPicker(props) {
  const [state, setState] = React.useState({
    background: props.defaultColor,
  });

  const handleChangeComplete = (color) => {
    setState({ background: color.hex });
    props.onChange(color.hex);
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
