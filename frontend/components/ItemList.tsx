import { Virtuoso } from "react-virtuoso";
import React from "react";
// actions
import { useAppDispatch } from "@/util/hooks";
import { bookmark } from "@/actions/windows";

export default function Itemlist(props) {
  const ref = React.useRef(null);
  const [currentItemIndex, setCurrentItemIndex] = React.useState(-1);
  const listRef = React.useRef(null);
  const dispatch = useAppDispatch();

  const keyDownCallback = React.useCallback(
    (e) => {
      let nextIndex = null;

      if (e.code === "ArrowUp") {
        nextIndex = Math.max(0, currentItemIndex - 1);
      } else if (e.code === "ArrowDown") {
        nextIndex = Math.min(props.data.length - 1, currentItemIndex + 1);
      } else if (e.code === "Enter") {
        dispatch(bookmark(props.data[currentItemIndex][0]));
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
  };



  return (
    <Virtuoso
      ref={ref}
      data={props.data}
      endReached={props.loadMore}
      itemContent={(index, item) =>
        props.render(index, item, currentItemIndex, handleSetCurrentItemIndex)
      }
      scrollerRef={scrollerRef}
    />
  );
}
