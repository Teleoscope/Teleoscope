import Head from "next/head";
import "primereact/resources/themes/lara-light-cyan/theme.css";

import { StrictMode, useState } from "react";
import { SessionProvider } from 'next-auth/react';
import { Stomp, StompContext } from "@/util/Stomp";
import { useEffect } from "react";
import { useRouter } from "next/router";
import "@/styles/global.css";
import { Toaster } from "@/components/ui/sonner"

export default App;
function App({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter()
  const [client, setClient] = useState(null)

  useEffect(() => {
    setClient(Stomp.getInstance({}))
    
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
  }, [router])
  
  return (
    <>
      <Head>
        <title>Teleoscope</title>
      </Head>
      <Toaster />

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
