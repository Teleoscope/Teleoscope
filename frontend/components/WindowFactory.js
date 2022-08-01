// Draggable.js
import React, { useState } from "react";
import Window from "../components/Window"
import WindowDefinitions from "../components/WindowDefinitions"

export default function WindowFactory(props) {
	const w = props.windata;
	const wdefs = WindowDefinitions();
	if (w.type == "FABMenu") {
		return (
			<div>{wdefs[w.type].component(w, props.id)}</div>
		)
	}
	return (
		<Window {...props}
			icon={wdefs[w.type].icon}
			inner={wdefs[w.type].component(w, props.id)} 
			showWindow={wdefs[w.type].showWindow}
		/>
	)
}
