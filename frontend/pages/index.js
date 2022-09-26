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

// import the login components
import LoginForm from "../components/Login/LoginForm"
import Registration from "../components/Login/Registration"

export default function Home({ isConnected }) {

  // test user for login page
  // This will be deleted when we connect it to
  // mongoDB with actual login and passwords
  const adminUser = {
    email: "admin@teleoscope.com",
    password: "teleoscope"
  }

  // used to set the user from the login and to catch errors if the login is tried with bad credentials
  const [user, setUser] = useState({ name: "Kenny", email: "" });
  const [error, setError] = useState("");
  const [registration, setRegistrationPage] = useState(false);

  // function for logging in the user
  // if the email and password match the mock user and password we then set 
  // the name and email to that information
  const Login = details => {
    if (details.email == adminUser.email && details.password == adminUser.password) {
      console.log("Logged In")
      setUser({
        name: details.name,
        email: details.email
      })
    } else {
      console.log("Details do not match")
      console.log(details)
    }
  }

  // function for logging out the user, sets the email and password to null
  const Logout = () => {
    console.log("Logged Out")
    setUser({
      email: "",
      password: ""
    })
  }

  // function to the registration hook to set registration to true or false
  const Register = () => {
    setRegistrationPage(!registration)
  }

  return (
    <div>
      {registration ? (
        <Provider store={store}>
          <Registration setRegistration={Register} />
        </Provider>) :
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
                        <Workspace isConnected={isConnected} Logout={Logout} />
                      </Provider>
                    </main>
                  </div>
                </CookiesProvider>
              </StompContext.Provider>
            </SWRConfig>
          ) : (
            <Provider store={store}>
              <LoginForm Login={Login} error={error} setRegistration={Register} />
            </Provider>
          )}
        </div>
      }
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
