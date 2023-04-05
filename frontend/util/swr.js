// swr.js
import useSWR from "swr";
import { useRouter } from "next/router";
import { useCookies } from "react-cookie";

const fetcher = async (url, token) => {
	const res = await fetch(url);
 
	// If the status code is not in the range 200-299,
	// we still try to parse and throw it.
	if (res.status === 401) {
		const error = new Error('Unauthorized action.');
		// Attach extra info to the error object.
		error.status = res.status;
		throw error;
	}
 
  	return res.json();
}

const useSWRAbstract = (data_key, url) => {
	const router = useRouter();

	var ret = {};

	const { data, error, mutate } = useSWR(url, fetcher);

	if (error !== undefined && error.status === 401) {
		router.push('/account/login');
	}

	ret[data_key] = data;
	ret[data_key + "_loading"] = !error && !data;
	ret[data_key + "_error"] = error;
	ret[data_key + "_mutate"] = mutate;
	return ret;
}

export default useSWRAbstract