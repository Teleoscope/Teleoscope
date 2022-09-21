import React, { useEffect, useState } from "react";
import Head from "next/head";

import { Provider } from "react-redux";
import { CookiesProvider } from "react-cookie";
import { SWRConfig } from 'swr'

// store
import store from "../stores/store";

// custom components
import Workspace from "../components/Workspace";

import clientPromise from '../util/mongodb';

// contexts
import { StompContext, client } from "../context/StompContext"

// API fetcher for SWR global config
const fetcher = (...args) => fetch(...args).then((res) => res.json())

// import the login screen
import LoginForm from "../components/Login/LoginForm"

export default function Home({ isConnected }) {

  // test user for login page
  const adminUser = {
    email: "admin@teleoscope.com",
    password: "teleoscope"
  }

  // used to set the user from the login and to catch errors if the login is tried with bad credentials
  const [user, setUser] = useState({ name: "Kenny", email: "" });
  const [error, setError] = useState("");

  // function for logging in the user
  const Login = details => {
    console.log(details)

    if (details.email == adminUser.email && details.password == adminUser.password){
      console.log("Logged In")
      setUser({
        name: details.name,
        email: details.email
      })
    } else {
      console.log("Details do not match")
    }
  }

  // function for logging out the user
  const Logout = () => {
    setUser({
      email: "",
      password: ""
    })
  }

  return (
    <div>
      {(user.email != "") ? (
        <SWRConfig value={{
          fetcher: fetcher,
          errorRetryCount: 10,
          refreshInterval: 250
        }}>
          <StompContext.Provider value={client}>
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
          </StompContext.Provider>
        </SWRConfig>
      ) : (
        <LoginForm Login={Login} error={error}/>
      )}
    </div>
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
    // db.find({}) or any of the MongoDB Node Driver commands

    return {
      props: { isConnected: true },
    }
  } catch (e) {
    console.error(e)
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
