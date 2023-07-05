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

  const { data: session, status } = useSession()  
  if (status === "loading") {
    return <p>Loading...</p>
  }

  // if (status === "unauthenticated") {
  //   return (
  //     <p> 
  //       <a href={`${process.env.NEXT_PUBLIC_NEXTAUTH_URL}/api/auth/signin`}> 
  //       Not signed in. Sign in here. 
  //       </a>
  //     </p>
  //     )
  // }

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
              <Workspace subdomain={subdomain} />
            </StoreProvider>
          </main>
        </div>
      </CookiesProvider>
    </SWRConfig>
  );
}
