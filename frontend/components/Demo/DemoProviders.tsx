import { Provider } from "react-redux";
import { SWRConfig } from "swr";
import { SWR, swrContext } from "@/util/swr";
import { Stomp, StompContext } from "@/util/Stomp";
import { demoStore } from "@/stores/store";

const fetcher = (...args) => fetch(...args).then((res) => res.json());

export default function DemoProviders(props) {
    const mySWR = new SWR("aita");
    const client = Stomp.getFakeClient();
    return (
      <SWRConfig
        value={{
          fetcher: fetcher,
          errorRetryCount: 10,
          refreshInterval: 250,
        }}
      >
        <Provider store={demoStore}>
          <swrContext.Provider value={mySWR}>
            <StompContext.Provider value={client}>
              {props.children}
            </StompContext.Provider>
          </swrContext.Provider>
        </Provider>
      </SWRConfig>
    );
  };