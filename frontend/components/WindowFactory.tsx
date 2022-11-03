import React from "react";
import Window from "./Window"
import WindowDefinitions from "./WindowDefinitions"
import useSWRAbstract from "../util/swr"

export default function WindowFactory(props) {
	const w = props.windata;
	const wdefs = WindowDefinitions();

	const type = w.i.split("%")[1];
	const id = w.i.split("%")[0];

	const { data } = useSWRAbstract("data", `/api/${type}s/${id}`);

	if (w.type == "FABMenu") {
		return (
			<div>{wdefs[w.type].component(w, props.id)}</div>
		)
	}
	return (
		<Window {...props}
			icon={wdefs[w.type].icon(data)}
			inner={wdefs[w.type].component(w, props.id, wdefs[w.type].color(data))}
			showWindow={wdefs[w.type].showWindow}
			data={data}
			title={wdefs[w.type].title(data)}
			color={wdefs[w.type].color(data)}
		/>
	)
}
