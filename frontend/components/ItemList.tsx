import { Virtuoso } from "react-virtuoso";
import React from "react";

export default function Itemlist(props) {
  const ref = React.useRef(null);
  const [currentItemIndex, setCurrentItemIndex] = React.useState(-1);
  const listRef = React.useRef(null);

  const keyDownCallback = React.useCallback(
    (e) => {
      let nextIndex = null;

      if (e.code === "ArrowUp") {
        nextIndex = Math.max(0, currentItemIndex - 1);
      } else if (e.code === "ArrowDown") {
        nextIndex = Math.min(99, currentItemIndex + 1);
      }

      if (nextIndex !== null) {
        ref.current.scrollIntoView({
          index: nextIndex,
          behavior: "auto",
          done: () => {
            setCurrentItemIndex(nextIndex);
          },
        });
        e.preventDefault();
      }
      props.onSelect(props.data[nextIndex]);
    },
    [currentItemIndex, ref, setCurrentItemIndex]
  );

  const scrollerRef = React.useCallback(
    (element) => {
      if (element) {
        element.addEventListener("keydown", keyDownCallback);
        listRef.current = element;
      } else {
        listRef.current.removeEventListener("keydown", keyDownCallback);
      }
    },
    [keyDownCallback]
  );

  const handleSetCurrentItemIndex = (index) => {
    setCurrentItemIndex(index);
    props.onSelect(props.data[index]);
  }

  return (
    <Virtuoso
      ref={ref}
      data={props.data}
      itemContent={(index, item) => props.render(index, item, currentItemIndex, handleSetCurrentItemIndex)}
      scrollerRef={scrollerRef}
      // style={{margin: "2px"}}
    />
  );
}
