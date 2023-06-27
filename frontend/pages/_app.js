import Head from "next/head";
import { useState, useEffect } from "react";
import "@/styles/global.css";
import { StrictMode } from "react";
import { SessionProvider } from 'next-auth/react'

export default App;
function App({ Component, pageProps: { session, ...pageProps } }) {

  const [authorized, setAuthorized] = useState(false);  
  useEffect(() => {setAuthorized(true);}, []);

  console.log("session", session, pageProps)

  return (
    <>
      <Head>
        <title>Teleoscope</title>
      </Head>

      <main>
        <StrictMode>
          <div className={`app-container`}>
            <SessionProvider session={session} >
            {authorized && <Component {...pageProps} />}
            </SessionProvider>
          </div>
        </StrictMode>
      </main>
    </>
  );
}
