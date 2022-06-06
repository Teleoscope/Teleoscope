import React from "react";
import Head from "next/head";
import { useEffect, useState } from "react";
import Draggable from "react-draggable";
import Fab from "@material-ui/core/Fab";
import AddIcon from "@material-ui/icons/Add";
import { makeStyles } from "@material-ui/core/styles";
import Workspace from "../components/Workspace";
import store from "../stores/store";
import { Provider } from "react-redux";
import { CookiesProvider } from "react-cookie";

import { connectToDatabase } from "../util/mongodb";

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

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
    <CookiesProvider>
    <DndProvider backend={HTML5Backend}>
        <div className="container">
          <Head>
            <title>Explore Documents</title>
            <link rel="icon" href="/favicon.ico" />
          </Head>

          <main>
            <Provider store={store}>
              <Workspace isConnected={isConnected} />
            </Provider>
          </main>
        </div>
    </DndProvider>
    </CookiesProvider>
  );
}

export async function getServerSideProps(context) {
  const { client } = await connectToDatabase();

  const isConnected = await client.isConnected();

  return {
    props: { isConnected },
  };
}
