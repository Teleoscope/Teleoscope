import Head from "next/head";
import { Provider as StoreProvider } from "react-redux";
import { CookiesProvider } from "react-cookie";
import { SWRConfig } from 'swr';
import { useRouter } from "next/router";
import store from "@/stores/store";
import Workspace from "@/components/Workspace";

import { getServerSession } from "next-auth/next";
import { authOptions } from "pages/api/auth/[...nextauth]";
import { redirect } from 'next/navigation';

const fetcher = (...args) => fetch(...args).then((res) => res.json());

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (session == null){
    return redirect("api/auth/signin")
  }

  const router = useRouter();
  const subdomain = router.query.site;

  if (!subdomain) {
    return (
      <div>Loading...</div>
    )
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
