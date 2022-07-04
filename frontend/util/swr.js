// swr.js
import useSWR from "swr";

const useSWRAbstract = (data_key, url) => {
	const { data, error, mutate } = useSWR(url);
	var ret = {}
	ret[data_key] = data;
	ret[data_key + "_loading"] = !error && !data;
	ret[data_key + "_error"] = error;
	ret[data_key + "_mutate"] = mutate;
	return ret;
}

export default useSWRAbstract