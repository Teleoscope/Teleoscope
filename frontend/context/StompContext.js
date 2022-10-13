import React from "react";
import { client_init } from "../components/Stomp.ts"

export const client = client_init();
export const StompContext = React.createContext();