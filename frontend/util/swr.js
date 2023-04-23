// swr.js
import useSWR from "swr";
import { useRouter } from "next/router";

// a custom fetcher to detect unauthorized actions
const fetcher = async (url) => {
	const res = await fetch(url);
 
	if (res.status === 401) {
		const error = new Error('Unauthorized action.');
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