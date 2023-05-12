// EditableText.tsx

import clientPromise from "@/util/mongodb";
import React, { useContext } from "react";

// Creat an EditableText component
function EditableText(props) {
  const [showInputElement, setShowInputElement] = React.useState(false);
  const [value, setValue] = React.useState(props.initialValue)
  
  const handleChange = (e) => {
    setValue(e.target.value)
  }

  return (
    // Render a <span> element
    <span>
      {
        // Use JavaScript's ternary operator to specify <span>'s inner content
        showInputElement ? (
          <input 
            type="text"
            value={value}
            onChange={(e) => handleChange(e)}
            onBlur={() => {
              setShowInputElement(false)
              props.callback(value)
            }}
            autoFocus
          />
        ) : (
          <span 
            onDoubleClick={() => {
              setShowInputElement(true)
            }}
          >
            {value}
          </span>
        )
      }
    </span>
  );
}

export default EditableText;