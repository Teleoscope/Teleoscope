import React from "react";
// actions
import { useAppDispatch } from "@/util/hooks";
import { bookmark } from "@/actions/windows";
import { GroupedVirtuoso } from "react-virtuoso";

export default function Itemlist({onSelect, data, render, loadMore}) {
  const ref = React.useRef(null);
  const [currentItemIndex, setCurrentItemIndex] = React.useState(-1);
  const listRef = React.useRef(null);
  const dispatch = useAppDispatch();

  if (!data) {
    return <></>
  }

  const groups = data ? data.length == 1 ? [] : data.map(d => `${d.id}: ${d.type}`): []

  const groupCounts = data ? data.map(d => d?.ranked_documents?.length) : []
  const reduced_data = data ? data.reduce((acc, dl) => acc.concat(dl?.ranked_documents), []) : []

  const keyDownCallback = React.useCallback(
    (e) => {
      let nextIndex = null;

      if (e.code === "ArrowUp") {
        nextIndex = Math.max(0, currentItemIndex - 1);
      } else if (e.code === "ArrowDown") {
        nextIndex = Math.min(reduced_data.length - 1, currentItemIndex + 1);
      } else if (e.code === "Enter") {
        dispatch(bookmark(reduced_data[currentItemIndex][0]));
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
      onSelect(reduced_data[nextIndex]);
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
    onSelect(reduced_data[index]);
  };

  return (
    <GroupedVirtuoso
      ref={ref}
      // data={data}
      groupCounts={groupCounts}
      endReached={loadMore}
      itemContent={(index) => render(index, reduced_data?.at(index), currentItemIndex, handleSetCurrentItemIndex)}
      scrollerRef={scrollerRef}
      groupContent={index => {
        return <div 
        style={{ 
          backgroundColor: 'white', 
          paddingTop: '1rem',
          borderBottom: '1px solid #ccc' 
        }}>{groups[index]}</div>
      }}
      style={{ height: 400 }}

    />
  );
}
