import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

import { Provider } from "react-redux";
import { CookiesProvider } from "react-cookie";
import { SWRConfig } from 'swr'

// store
import store from '../stores/store';

import '../styles/global.css';


import { userService } from '../services/user.service';

export default App;

function App({ Component, pageProps }) {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [authorized, setAuthorized] = useState(false);

    const fetcher = (...args) => fetch(...args).then((res) => res.json())

    useEffect(() => {
        // on initial load - run auth check 
        authCheck(router.asPath);

        // on route change start - hide page content by setting authorized to false  
        const hideContent = () => setAuthorized(false);
        router.events.on('routeChangeStart', hideContent);

        // on route change complete - run auth check 
        router.events.on('routeChangeComplete', authCheck)

        // unsubscribe from events in useEffect return function
        return () => {
            router.events.off('routeChangeStart', hideContent);
            router.events.off('routeChangeComplete', authCheck);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function authCheck(url) {
        // redirect to login page if accessing a private page and not logged in 
        setUser(userService.userValue);
        const publicPaths = ['/account/login', '/account/register'];
        const path = url.split('?')[0];
        if (!userService.userValue && !publicPaths.includes(path)) {
            setAuthorized(false);
            router.push({
                pathname: '/account/login',
                query: { returnUrl: router.asPath }
            });
        } else {
            setAuthorized(true);
        }
    }

    return (
        <>
            <SWRConfig value={{
                fetcher: fetcher,
                errorRetryCount: 10,
                refreshInterval: 250
            }}>
                <CookiesProvider>
                    <Head>
                        <title>Teleoscope</title>
                        <link href="//netdna.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet" />
                    </Head>
                    
                    <main>
                        <Provider store={store}>
                            <div className={`app-container ${user ? 'bg-light' : ''}`}>
                                {authorized && <Component {...pageProps} />}
                            </div>
                        </Provider>
                    </main>

                </CookiesProvider>
            </SWRConfig>
        </>

    );
}