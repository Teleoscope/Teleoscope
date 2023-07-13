import Head from "next/head";
import "@/styles/global.css";
import { StrictMode } from "react";
import { SessionProvider } from 'next-auth/react';
import { Stomp, StompContext } from "@/util/Stomp";
import { useEffect } from "react";
import { useRouter } from "next/router";
const client = Stomp.getInstance({})
export default App;
function App({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter()
  
  useEffect(() => {
    const handleWindowClose = (e) => {
      Stomp.stop()
    }
    const handleBrowseAway = () => {
      Stomp.stop()
    }
    window.addEventListener('beforeunload', handleWindowClose)
    router.events.on('routeChangeStart', handleBrowseAway)
    return () => {
      window.removeEventListener('beforeunload', handleWindowClose)
      router.events.off('routeChangeStart', handleBrowseAway)
    }
  }, [])  
  
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
