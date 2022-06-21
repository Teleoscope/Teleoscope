// ResponsivePostContent.js
import React, { useState, useEffect, useRef } from 'react';
import useSWR from "swr";
import useDimensions from "react-cool-dimensions";
import { useSelector, useDispatch } from "react-redux"


// fonts
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

// mui
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import CircleIcon from '@mui/icons-material/Circle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack'
import { pink } from '@mui/material/colors';

const postTitle = (post) => {
	if (!post) {
		return "";
	}
	String.prototype.trimLeft = function (charlist) {
		if (charlist === undefined) charlist = "s";
		return this.replace(new RegExp("^[" + charlist + "]+"), "");
	};
	var regex = new RegExp(
		"(AITA for|aita for|AITA if|WIBTA if|AITA|aita|WIBTA)"
		);
	var title = post["title"].replace(regex, "");
	var charlist = " -";
	title = title.trimLeft(charlist);
	var first = title.slice(0, 1);
	var ret = first.toUpperCase() + title.slice(1);
	return ret;
};


function getsize(w) {
	if (w < 50) {
		return "xs"
	}
	if (w < 100) {
		return "sm"
	}
	if (w < 300) {
		return "md"
	}
	if (w < 500) {
		return "lg"
	}
	return "xl"
}


export default function ResponsivePostContent(props) {
	const { data, error } = useSWR(`/api/posts/${props.id}`);
	const groups = useSelector((state) => state.grouper.value);
	const group = groups.find(item => item.id == props.id);
	const { observe, unobserve, width, height, entry } = useDimensions({
		// Triggered whenever the size of the target is changed...
		onResize: ({ observe, unobserve, width, height, entry }) => {
	      unobserve(); // To stop observing the current target element
	      observe(); // To re-start observing the current target element
		},
	});
	const size = getsize(width);
}