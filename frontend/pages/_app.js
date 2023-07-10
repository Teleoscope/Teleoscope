import Head from "next/head";
import "@/styles/global.css";
import { StrictMode, useState } from "react";
import { SessionProvider } from 'next-auth/react';
import store from "@/stores/store";
import { Provider as StoreProvider } from "react-redux";
import { Stomp, StompContext } from "@/util/Stomp";

export default App;
function App({ Component, pageProps: { session, ...pageProps } }) {
  
  const [client, setClient] = useState(Stomp.getInstance({}));
  
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

              <StoreProvider store={store}>
                <Component {...pageProps} />
              </StoreProvider>
              </StompContext.Provider>

            </SessionProvider>
          </div>
        </StrictMode>
      </main>
    </>
  );
}
