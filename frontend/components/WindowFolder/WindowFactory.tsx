import React, { useContext } from "react";
import Window from "./Window"
import WindowDefinitions from "./WindowDefinitions"
import { swrContext } from "@/util/swr"

export default function WindowFactory(props) {
	const w = props.windata;

	const wdefs = WindowDefinitions();

	const keymap = {
		"note": "note",
		"notepalette": "notes",
		"fabmenu": "fabmenu",
		"group": "groups",
		"document": "document",
		"teleoscope": "teleoscopes",
		"teleoscopepalette": "teleoscopepalette",
		"search": "search",
		"grouppalette": "grouppalette",
		"clusters": "clusters",
		"cluster": "cluster",
	}
	const type = w.i.split("%")[1];
	const id = w.i.split("%")[0];

	const key = keymap[type];
	const swr = useContext(swrContext);
	const { data } = swr.useSWRAbstract("data", `${key}/${id}`);

	if (w.type == "FABMenu") {
		return (
			<div>{wdefs[w.type].component(w, props.id, "#FFFFFF")}</div>
		)
	}


	return (
		<Window {...props}
			icon={wdefs[w.type].icon(data)}
			inner={wdefs[w.type].component(w, props.id, wdefs[w.type].color(data))}
			showWindow={wdefs[w.type].showWindow || w.showWindow}
			data={data}
			title={wdefs[w.type].title(data)}
			color={wdefs[w.type].color(data)}
		/>
	)
}
