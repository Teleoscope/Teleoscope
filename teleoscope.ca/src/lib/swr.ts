import axios from 'axios';
import useSWR from 'swr';

const defaultFetcher = (url: string) => axios.get(url).then((res) => res.data);
const defaultConfig = {
    refreshInterval: 60000, // update every minute
    revalidateOnFocus: true,
    revalidateOnReconnect: true
};
export const useSWRF = (
    key: string | null,
    config = {},
    fetcher = defaultFetcher
) => useSWR(key, fetcher, { 
    ...defaultConfig,
    ...config 
});
