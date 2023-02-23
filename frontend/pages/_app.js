import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

import '../styles/global.css';

export default App;

function App({ Component, pageProps }) {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [authorized, setAuthorized] = useState(true);

    return (
        <>
            <Head>
                <title>Teleoscope</title>
                <link href="//netdna.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet" />
            </Head>

            <main>
                <div className={`app-container ${user ? 'bg-light' : ''}`}>
                    {authorized && <Component {...pageProps} />}
                </div>
            </main>
        </>

    );
}