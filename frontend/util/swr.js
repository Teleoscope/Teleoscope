// swr.js
import useSWR, { mutate } from "swr";

const useSWRAbstract = (data_key, url) => {
	const { data, error } = useSWR(url);
	var ret = {}
	ret[data_key] = data;
	ret[data_key + "_loading"] = !error && !data;
	ret[data_key + "_error"] = error;
	return ret;
}

export default useSWRAbstract