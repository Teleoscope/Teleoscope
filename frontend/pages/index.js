import React from "react";
import Head from "next/head";

import { Provider } from "react-redux";
import { CookiesProvider } from "react-cookie";
import { connectToDatabase } from "../util/mongodb";
import { SWRConfig } from 'swr'

// store
import store from "../stores/store";

// custom components
import Workspace from "../components/Workspace";

// API fetcher for SWR global config
const fetcher = (...args) => fetch(...args).then((res) => res.json())


export default function Home({ isConnected }) {
  return (
    <SWRConfig value={{ fetcher }}>
    <CookiesProvider>
        <div className="container">
          <Head>
            <title>Explore Documents</title>
            <link rel="icon" href="/favicon.ico" />
          </Head>

          <main>
            <Provider store={store}>
              <Workspace isConnected={isConnected} />
            </Provider>
          </main>
        </div>
    </CookiesProvider>
    </SWRConfig>
  );
}

// Connect to MongoDB
export async function getServerSideProps(context) {
  const { client } = await connectToDatabase();
  const isConnected = await client.isConnected();
  return {
    props: { isConnected },
  };
}
