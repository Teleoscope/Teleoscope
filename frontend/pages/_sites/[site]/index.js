import React from "react";
import Head from "next/head";

import { Provider as StoreProvider } from "react-redux";
import { CookiesProvider } from "react-cookie";
import { SWRConfig } from "swr";

import { useRouter } from "next/router";

// store
import store from "@/stores/store";

// custom components
import Workspace from "@/components/Workspace";

// API fetcher for SWR global config
//const fetcher = (...args: Parameters<typeof fetch>) => fetch(...args).then((res) => res.json())
const fetcher = (...args) => fetch(...args).then((res) => res.json());


export default function Home() {
  const router = useRouter();
  const subdomain = router.query.site;

  return (

    <SWRConfig
      value={{
        fetcher: fetcher,
        errorRetryCount: 10,
        refreshInterval: 250,
      }}
    >
      <CookiesProvider>
        <div>
          <Head>
            <title>Explore Documents</title>
            <link rel="icon" href="/favicon.ico" />
          </Head>

          <main>
            <StoreProvider store={store}>
              <Workspace subdomain={subdomain} />
            </StoreProvider>
          </main>
        </div>
      </CookiesProvider>
    </SWRConfig>
  );
}
