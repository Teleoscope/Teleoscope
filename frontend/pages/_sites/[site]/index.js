import Head from "next/head";
import { Provider as StoreProvider } from "react-redux";
import { CookiesProvider } from "react-cookie";
import { SWRConfig } from 'swr';
import { useRouter } from "next/router";
import store from "@/stores/store";
import Workspace from "@/components/Workspace";
import { useSession } from "next-auth/react";


const fetcher = (...args) => fetch(...args).then((res) => res.json());

export default function Home() {
  const router = useRouter();
  const subdomain = router.query.site;

  if (!subdomain) {
    return (
      <div>Loading...</div>
    )
  }

  const { data: session, status } = useSession()

  if (status != "authenticated") {
    // return <div>Not signed in.</div>
  }

  const swrConfig = {
    fetcher: fetcher,
    errorRetryCount: 10,
    refreshInterval: 250,
  };

  return (
    <SWRConfig value={swrConfig}>
      <CookiesProvider>
        <div>
          <Head>
            <title>Explore Documents</title>
            <link rel="icon" href="/favicon.ico" />
          </Head>
          <main>
            <StoreProvider store={store}>
              <Workspace session={session} status={status} subdomain={subdomain} />
            </StoreProvider>
          </main>
        </div>
      </CookiesProvider>
    </SWRConfig>
  );
}
