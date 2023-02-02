// EditableText.tsx

import React from "react";

// Creat an EditableText component
function EditableText(props) {
  const [showInputElement, setShowInputElement] = React.useState(false);
  const [value, setValue] = React.useState(props.initialValue)
  
  const handleChange = (e) => {
    setValue(e.target.value)
    props.callback(e)
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
            onBlur={() => setShowInputElement(false)}
            autoFocus
          />
        ) : (
          <span 
            onDoubleClick={() => setShowInputElement(true)}
            style={{ 
              display: "inline-block", 
              height: "25px", 
              minWidth: "300px", 
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