import Head from "next/head";
import "@/styles/global.css";
import { StrictMode } from "react";
import { SessionProvider } from 'next-auth/react';
import { Stomp, StompContext } from "@/util/Stomp";

const client = Stomp.getInstance({})
export default App;
function App({ Component, pageProps: { session, ...pageProps } }) {
  
  
  
  return (
    <>
      <Head>
        <title>Teleoscope</title>
      </Head>

      <main>
        <StrictMode>
          <div className={`app-container`}>
            <SessionProvider session={session} >
              <StompContext.Provider value={client}>
                <Component {...pageProps} />
              </StompContext.Provider>
            </SessionProvider>
          </div>
        </StrictMode>
      </main>
    </>
  );
}
