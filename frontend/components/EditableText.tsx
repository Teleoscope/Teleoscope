import React from "react";

// Creat an EditableText component
function EditableText({ initialValue, callback }) {
  const [showInputElement, setShowInputElement] = React.useState(false);
  const [value, setValue] = React.useState(initialValue);

  const handleChange = (e) => {
    setValue(e.target.value);
  };

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
              setShowInputElement(false);
              callback(value);
            }}
            autoFocus
          />
        ) : (
          <span
            onDoubleClick={() => {
              setShowInputElement(true);
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
