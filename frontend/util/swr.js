// swr.js
import useSWR from "swr";
import { useContext, createContext } from "react";

export const swrContext = createContext(null);
export const useSWRHook = () => useContext(swrContext);

export class SWR {
  constructor(subdomain) {
    this.subdomain = subdomain;
  }

  useSWRAbstract = (datakey, url, options={}) => {
    var ret = {};
    const { data, error, mutate } = useSWR(`/api/${this.subdomain}/${url}`, options);
    ret[datakey] = data;
    ret[datakey + "_loading"] = !error && !data;
    ret[datakey + "_error"] = error;
    ret[datakey + "_mutate"] = mutate;
    return ret;
  };
} 
