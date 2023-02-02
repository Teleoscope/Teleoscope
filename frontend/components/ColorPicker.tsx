import React from 'react';
import { SketchPicker } from 'react-color';

export default function ColorPicker(props) {

   const [state, setState] = React.useState({
        background: props.defaultColor,
    })

  const handleChangeComplete = (color) => {
    setState({ background: color.hex });
    
  };

  
    return (
      <SketchPicker
        color={ state.background }
        onChangeComplete={ handleChangeComplete }
      />
    );
}

