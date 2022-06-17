import React from "react";
import Head from "next/head";

import { Provider } from "react-redux";
import { CookiesProvider } from "react-cookie";
import { connectToDatabase } from "../util/mongodb";

// store
import store from "../stores/store";

// custom components
import Workspace from "../components/Workspace";

export default function Home({ isConnected }) {
  return (
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
  );
}

export async function getServerSideProps(context) {
  const { client } = await connectToDatabase();

  const isConnected = await client.isConnected();

  return {
    props: { isConnected },
  };
}
