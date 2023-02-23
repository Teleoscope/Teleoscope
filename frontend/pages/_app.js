import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

import '../styles/global.css';

export default App;

function App({ Component, pageProps }) {
    return (
        <>
            <Head>
                <title>Teleoscope</title>
                <link href="//netdna.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet" />
            </Head>

            <main>
                <Component {...pageProps} />
            </main>
        </>
    );
}