import { useEffect } from "react";

import { useKeyPress } from "reactflow";

export default function Keylogger({callback}) {
  
    const spacePressed = useKeyPress('/');
  
    useEffect(() => {
      callback("/", spacePressed)
    }, [spacePressed, callback]);  

    return <></>
}