import Head from "next/head";
import { CookiesProvider } from "react-cookie";
import { SWRConfig } from 'swr';
import { useRouter } from "next/router";
import Workspace from "@/components/Workspace";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import store from "@/stores/store";
import { Provider as StoreProvider } from "react-redux";

const fetcher = (...args) => fetch(...args).then((res) => res.json());

export default function Home() {
  const router = useRouter();
  const { data: workspace } = useSWR(`https://${process.env.NEXT_PUBLIC_FRONTEND_HOST}/api/workspaces/${router.query.workspace}`, fetcher)

  const database = workspace?.database;
  const workflow_id = workspace?.workflows[0]
  
  const { data: workflow, error } =  useSWR(`https://${process.env.NEXT_PUBLIC_FRONTEND_HOST}/api/${database}/workflows/${workflow_id}`, fetcher)

  const initial_state = !workflow ? null : {
    "windows": workflow.history[0],
    "activeSessionID": {
      value: `${workflow["_id"]}`,
      workspace: `${router.query.workspace}`
    }
  }

  const { data: session, status } = useSession()

  if (status === "loading") {
    return <p>Loading {database}...</p>
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

  if (!database || !workflow) {
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
    <StoreProvider store={store(initial_state)}>

    <SWRConfig value={swrConfig}>
      <CookiesProvider>
        <div>
          <Head>
            <title>Teleoscope</title>
            <link rel="icon" href="/favicon.ico" />
          </Head>
          <main>
              <Workspace subdomain={database} />
          </main>
        </div>
      </CookiesProvider>
    </SWRConfig>
    </StoreProvider>

  );
}
