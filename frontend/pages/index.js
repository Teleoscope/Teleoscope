import React from "react";
import Head from "next/head";
import { useEffect, useState } from "react";
import { connectToDatabase } from "../util/mongodb";
import Layout from "../components/layout";
import Draggable from "react-draggable";
import Fab from "@material-ui/core/Fab";
import AddIcon from "@material-ui/icons/Add";
import { makeStyles } from "@material-ui/core/styles";
import Workspace from "../components/Workspace";

const useStyles = makeStyles((theme) => ({
  root: {
    "& > *": {
      margin: theme.spacing(1),
    },
  },
  extendedIcon: {
    marginRight: theme.spacing(1),
  },
}));

export default function Home({ isConnected }) {
  const [docSets, setDocSets] = useState([]);

  const handleClick = (evt) => {

    // evt.preventDefault();
    // var temp = [...docSets];
    // temp.push({ show: true });
    // setDocSets(temp);
  };
  const classes = useStyles();

  const handleClose = (i) => {
    // var temp = [...docSets];
    // temp[i] = { show: false };
    // setDocSets(temp);
  };

  return (
    <Layout>
      <div className="container">
        <Head>
          <title>Explore Documents</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main>
          <Workspace 
            isConnected={isConnected}
          />
        </main>
      </div>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const { client } = await connectToDatabase();

  const isConnected = await client.isConnected();

  return {
    props: { isConnected },
  };
}
