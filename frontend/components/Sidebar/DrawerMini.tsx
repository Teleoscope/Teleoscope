import { useState } from "react";
import Flow from "@/components/Flow/Flow";
import Accordion from "@/components/Sidebar/Accordion";
import TopBar from "@/components/TopBar";
import TeleoscopeLogo from "@/components/TeleoscopeLogo";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const drawerWidth = 20;
const minWidth = 10;

export default function PermanentDrawerRight() {
  const [width, setWidth] = useState(drawerWidth);

  const handleDoubleClick = () => {
    if (width == minWidth) {
      setWidth(drawerWidth);
    } else {
      setWidth(minWidth);
    }
  };

  const DrawerComponent = () => {
    return (
      <section className="flex flex-col flex-1 overflow-y-scroll w-full overflow-x-hidden">
        <section className="flex flex-col p-1 py-5 items-center justify-center border-b">
          <TeleoscopeLogo
            compact={false}
            color="#CCCCCC"
          ></TeleoscopeLogo>
          <TopBar compact={false}></TopBar>
        </section>
        <Accordion compact={false}></Accordion>
      </section>
    );
  };

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="flex flex-row overflow-hidden"
    >
      <ResizablePanel
        className="flex flex-col shadow-sm bg-white border w-full "
        maxSize={100}
      >
        <Flow drawerWidth={width} />
      </ResizablePanel>
      <ResizableHandle
        withHandle
        className=" bg-neutral-100  cursor-ew-resize "
      />
      <ResizablePanel
        className="flex flex-col  shadow-sm   bg-white border"
        minSize={minWidth}
        defaultSize={30}
      >
        <DrawerComponent />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
