import Head from "next/head";
import { CookiesProvider } from "react-cookie";
import { SWRConfig } from 'swr';
import { useRouter } from "next/router";
import Workspace from "@/components/Workspace";
import { useSession } from "next-auth/react";

const fetcher = (...args) => fetch(...args).then((res) => res.json());

export default function Home() {
  const router = useRouter();
  const workspace = router.query.workspace
  const subdomain = workspace;

  const { data: session, status } = useSession()
  
  if (status === "loading") {
    return <p>Loading {subdomain}...</p>
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
            <title>Teleoscope</title>
            <link rel="icon" href="/favicon.ico" />
          </Head>
          <main>
              <Workspace subdomain={subdomain} />
          </main>
        </div>
      </CookiesProvider>
    </SWRConfig>
  );
}
