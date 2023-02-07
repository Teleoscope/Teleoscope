// swr.js
import useSWR from "swr";

const useSWRAbstract = (data_key, url) => {
	var ret = {}
	const { data, error, mutate } = useSWR(url);
	ret[data_key] = data;
	ret[data_key + "_loading"] = !error && !data;
	ret[data_key + "_error"] = error;
	ret[data_key + "_mutate"] = mutate;
	return ret;
}

export default useSWRAbstract