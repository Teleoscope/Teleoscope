import React, { useContext } from "react";

// client imports
import { Provider } from "react-redux";
import { CookiesProvider } from "react-cookie";
import { SWRConfig } from 'swr'

// store
import store from "../../stores/store";

// custom imports
import Registration from "../../components/Login/RegisterUser/Registration";

const fetcher = (...args) => fetch(...args).then((res) => res.json());
export default function Register() {

    return (
        <div>
            <SWRConfig value={{
                fetcher: fetcher,
                errorRetryCount: 10,
                refreshInterval: 250
            }}>
                <CookiesProvider>
                    <Provider store={store}>
                        <Registration/>
                    </Provider>
                </CookiesProvider>
            </SWRConfig>
        </div>
    );
}