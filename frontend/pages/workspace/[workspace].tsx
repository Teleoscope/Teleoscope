import Head from "next/head";
import { SWRConfig } from 'swr';
import Workspace from "@/components/Workspace";
import { useSession } from "next-auth/react";
import createStore from "@/stores/store";
import { Provider as StoreProvider } from "react-redux";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { MongoClient } from "mongodb";
import { ObjectId } from "bson";

const fetcher = (...args) => fetch(...args).then((res) => res.json());

export async function getServerSideProps(context) {
  const session = await getServerSession(
    context.req,
    context.res,
    authOptions
  )

  let client = await new MongoClient(process.env.MONGODB_URI).connect();
  let db = await client.db("users");

  const workspace = await db
    .collection("workspaces")
    .findOne({ owner: new ObjectId(session.user.id), _id: new ObjectId(context.query.workspace)});
  client.close()

  const database = workspace.database;
  const workflow_id = workspace.workflows[0]

  db = await client.db(database);
  const workflow = await db.collection("sessions").findOne(
    {_id: new ObjectId(workflow_id)},
    {projection: { projection: { history: { $slice: 1 } } }}
  )
  
  

  const outflow = {
      nodes: workflow.history[0].nodes,
      edges: workflow.history[0].edges,
      bookmarks: workflow.history[0].bookmarks,
      logical_clock: workflow.history[0].logical_clock,
      label: workflow.history[0].label,
      selection: workflow.history[0].selection,
      settings: workflow.history[0].settings,
  }
  console.log("outflow", outflow)

  client.close()

  return {
    props: {
      database: database,
      session: session,
      workflow: outflow,
      session_id: workflow_id.toString()
    }
  }

}


export default function Home({database, workflow, session_id}) {
  

  const { data: session, status } = useSession()

  const preloaded = {
    "activeSessionID": session_id,
    "windows": workflow,
  }
  const store = createStore(preloaded)

 
  if (status === "unauthenticated") {
    return (
      <p> 
        <a href={`${process.env.NEXT_PUBLIC_NEXTAUTH_URL}/api/auth/signin`}> 
        Not signed in. Sign in here.
        </a>
      </p>
      )
  }

  if (!database || status === "loading") {
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
    <StoreProvider store={store}>
      <SWRConfig value={swrConfig}>
          <div>
            <Head>
              <title>Teleoscope</title>
              <link rel="icon" href="/favicon.ico" />
            </Head>
            <main>
                <Workspace subdomain={database} />
            </main>
          </div>
      </SWRConfig>
    </StoreProvider>

  );
}
