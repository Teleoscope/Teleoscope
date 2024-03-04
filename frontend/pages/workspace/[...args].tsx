// Import necessary libraries and components
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

// Define a fetcher function for SWR
const fetcher = (...args) => fetch(...args).then((res) => res.json());

/**
 * Fetches server-side props including user session and workspace details from MongoDB.
 * @param {object} context - The context object provided by Next.js for server-side rendering.
 * @returns {Promise<object>} An object containing props for the page.
 */
export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return { props: { workspace: null, database: null, session: null, workflow: null, workflow_id: null } };
  }

  const workspace_id = context.query.args[0];
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db("users");

  const workspace = await db.collection("workspaces").findOne({
    $or: [{ owner: new ObjectId(session.user.id) }, { "contributors.id": new ObjectId(session.user.id) }],
    _id: new ObjectId(workspace_id)
  });

  if (!workspace) {
    client.close();
    return { props: { workspace: null, database: null, session: null, workflow: null, workflow_id: null } };
  }

  const workflow_id = context.query.args[1] || workspace.workflows[0];
  const workflowDb = client.db(workspace.database);
  
  const workflow = await workflowDb.collection("sessions").findOne(
    { _id: new ObjectId(workflow_id) },
    { projection: { history: { $slice: 1 } } }
  );

  client.close();

  const outflow = workflow.history[0] ? {
    nodes: workflow.history[0].nodes || [],
    edges: workflow.history[0].edges || [],
    bookmarks: workflow.history[0].bookmarks || [],
    logical_clock: workflow.history[0].logical_clock,
    label: workflow.history[0].label,
    selection: workflow.history[0].selection || { nodes: [], edges: [] },
    settings: workflow.history[0].settings || {},
  } : {};

  return {
    props: {
      workspace: workspace_id,
      database: workspace.database,
      session,
      workflow: outflow,
      workflow_id: workflow_id.toString(),
    }
  };
}

// The main component for the page
export default function Home({workspace, database, workflow, workflow_id}) {
  const { status } = useSession();
  const store = createStore({ "activeSessionID": { value: workflow_id, workspace }, "windows": workflow });

  if (status === "unauthenticated") {
    return <p><a href="/api/auth/signin">Not signed in. Sign in here.</a></p>;
  }

  if (!database || status === "loading") {
    return <div>Loading...</div>;
  }

  // Configuration for SWR
  const swrConfig = {
    fetcher,
    errorRetryCount: 10,
    refreshInterval: 250,
  };

  return (
    <StoreProvider store={store}>
      <SWRConfig value={swrConfig}>
        <Head>
          <title>Teleoscope</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <main>
          <Workspace database={database} workflow={workflow_id} workspace={workspace} />
        </main>
      </SWRConfig>
    </StoreProvider>
  );
}
