/**
 * Entrypoint for workspaces.
 */

import Head from "next/head";
import { SWRConfig } from 'swr';
import Workspace from "@/components/Roots/Workspace";
import { useSession } from "next-auth/react";
import createStore from "@/stores/store";
import { Provider as StoreProvider } from "react-redux";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { MongoClient } from "mongodb";
import { ObjectId } from "bson";

const fetcher = (...args) => fetch(...args).then((res) => res.json());

// Supposedly this renders server-side only, so OK to use credentials
export async function getServerSideProps(context) {
  const session = await getServerSession(
    context.req,
    context.res,
    authOptions
  )

  if (!session) {
    return {
      props: {
        workspace: null,
        database: null,
        session: null,
        workflow: null,
        workflow_id: null,
        req: null
      }
    }
  }

  const workspace_id = context.query.args[0]

  const client = await new MongoClient(process.env.MONGODB_URI).connect();
  let db = await client.db("users");

  const workspace = await db
  .collection("workspaces")
  .findOne({
    $or: [
      { owner: new ObjectId(session.user.id) },
      { "contributors.id": new ObjectId(session.user.id) }
    ],
    _id: new ObjectId(workspace_id)
  });

  client.close()

  const database = workspace.database;
  const workflow_id = context.query.args.length == 2 ? context.query.args[1] : workspace.workflows[0]

  db = await client.db(database);
  
  const workflow = await db.collection("sessions").findOne(
    {_id: new ObjectId(workflow_id)},
    {projection: { projection: { history: { $slice: 1 } } }}
  )

  const outflow = {
      nodes: workflow.history[0].nodes ? workflow.history[0].nodes : [],
      edges: workflow.history[0].edges ? workflow.history[0].edges : [],
      bookmarks: workflow.history[0].bookmarks ? workflow.history[0].bookmarks : [],
      logical_clock: workflow.history[0].logical_clock,
      label: workflow.history[0].label,
      selection: workflow.history[0].selection ? workflow.history[0].selection : { nodes: [], edges: []},
      settings: workflow.history[0].settings ? workflow.history[0].settings : {} ,
  }

  client.close()

  return {
    props: {
      workspace: workspace_id,
      database: database,
      session: session,
      workflow: outflow,
      workflow_id: workflow_id.toString(),
      req: context.req
    }
  }

}


export default function Home({workspace, database, workflow, workflow_id, req}) {
  

  const { data: session, status } = useSession()

  const preloaded = {
    "activeSessionID": {
      value: workflow_id,
      workspace: workspace
    },
    "windows": workflow,
  }
  const store = createStore(preloaded)

 
  if (status === "unauthenticated") {
    return (
      <p> 
        <a href={`${req.headers.host}/api/auth/signin`}> 
        Not signed in. Sign in here.
        </a>
      </p>
      )
  }

  if (!req || !database || status === "loading") {
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
                <Workspace database={database} workflow={workflow_id} workspace={workspace} />
            </main>
          </div>
      </SWRConfig>
    </StoreProvider>

  );
}
