// Draggable.js
import React, { useState } from "react";
import Window from "../components/Window"
import WindowDefinitions from "../components/WindowDefinitions"
import useSWRAbstract from "../util/swr"

export default function WindowFactory(props) {
	const w = props.windata;
	const wdefs = WindowDefinitions();
	
	const type = w.i.split("%")[1];
  	const id = w.i.split("%")[0];

	const { data } = useSWRAbstract("data", `/api/${type}s/${id}`);
	const title = wdefs[w.type].title(data)

	if (w.type == "FABMenu") {
		return (
			<div>{wdefs[w.type].component(w, props.id)}</div>
		)
	}
	return (
		<Window {...props}
			icon={wdefs[w.type].icon(data)}
			inner={wdefs[w.type].component(w, props.id)} 
			showWindow={wdefs[w.type].showWindow}
			data={data}
			title={title}
		/>
	)
}
