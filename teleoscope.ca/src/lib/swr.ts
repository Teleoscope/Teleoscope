import axios from 'axios';
import useSWR from 'swr';

export const fetcher = (url: string) => axios.get(url).then(res => res.data)
export const useSWRF = (key: string | null) => useSWR(key, fetcher)
