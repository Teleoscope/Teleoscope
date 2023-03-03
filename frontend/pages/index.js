import React from "react";
import Head from "next/head";

import { Provider } from "react-redux";
import { CookiesProvider } from "react-cookie";
import { SWRConfig } from 'swr'

// store
import store from "../stores/store";

// custom components
import Workspace from '../components/Workspace';
import clientPromise from '../util/mongodb';

// API fetcher for SWR global config
//const fetcher = (...args: Parameters<typeof fetch>) => fetch(...args).then((res) => res.json())
const fetcher = (...args) => fetch(...args).then((res) => res.json());

export default function Home({ isConnected }) {
  return (
    <SWRConfig value={{ 
      fetcher: fetcher,
      errorRetryCount: 10,
      refreshInterval: 250
    }}>
    <CookiesProvider>
        <div>
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



export async function getServerSideProps(context) {
  try {
    await clientPromise
    // `await clientPromise` will use the default database passed in the MONGODB_URI
    // However you can use another database (e.g. myDatabase) by replacing the `await clientPromise` with the following code:
    //
    // `const client = await clientPromise`
    // `const db = client.db("myDatabase")`
    //
    // Then you can execute queries against your database like so:
    // db.find({ }) or any of the MongoDB Node Driver commands

    return {
      props: { isConnected: true },
    }
  } catch (e) {
    console.error(e, context)
    return {
      props: { isConnected: false },
    }
  }
}
//
// 
// Connect to MongoDB
// export async function getServerSideProps(context) {
//   const { client } = await connectToDatabase();
//   const isConnected = await client.isConnected();
//   return {
//     props: { isConnected },
//   };
// }
