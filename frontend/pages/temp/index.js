import React from "react";
import Head from "next/head";

import { Provider } from "react-redux";
import { CookiesProvider } from "react-cookie";
import { SWRConfig } from "swr";

// store
import store from "@/stores/store";

// custom components
import Workspace from "@/components/Workspace";

// API fetcher for SWR global config
const fetcher = (...args) => fetch(...args).then((res) => res.json());

export default function Home() {

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
            <Provider store={store}>
              <Workspace subdomain={"aita"} />
            </Provider>
          </main>
        </div>
      </CookiesProvider>
    </SWRConfig>
  );
}
