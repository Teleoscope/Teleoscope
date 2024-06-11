'use client';
import HelpOverlay from '@/components/HelpOverlay';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@/components/ui/resizable';
import { useState } from 'react';
import TopBar from '@/components/Sidebar/TopBar';
import TeleoscopeLogo from '@/components/TeleoscopeLogo';
import { useSWRF } from '@/lib/swr';
import { Workspaces } from '@/types/workspaces';

interface WorkspaceProps {
  workspace: string;
  drawerWidth?: number;
  minWidth?: number;
  logoColor?: string;
  logoHoverColor?: string;
  logoTextDecorationColor?: string;
  topBarColor?: string;
  compact?: boolean;
}

export default function Workspace({
  workspace: workspace_id,
  drawerWidth = 20,
  minWidth = 10,
  logoColor = '#CCCCCC',
  logoHoverColor,
  logoTextDecorationColor,
  topBarColor = '#FF0000',
  compact = false
}: WorkspaceProps) {
  const [width, setWidth] = useState(drawerWidth);
  const {
    data: workspace,
    error,
    isLoading
  }: { data: Workspaces; error: any; isLoading: boolean } = useSWRF(
    `/api/workspace?workspace=${workspace_id}`
  );

  if (error || isLoading) {
    return <>Loading...</>;
  }

  return (
    <>
      <HelpOverlay />
      <ResizablePanelGroup
        direction="horizontal"
        className="flex flex-row overflow-hidden"
      >
        <ResizablePanel
          className="flex flex-col shadow-sm bg-white border w-full"
          maxSize={100}
        >
          {/* <Flow drawerWidth={width} /> */}
        </ResizablePanel>
        <ResizableHandle
          withHandle
          className="bg-neutral-100 cursor-ew-resize"
        />
        <ResizablePanel
          className="flex flex-col shadow-sm bg-white border"
          minSize={minWidth}
          defaultSize={30}
        >
          <div className="flex flex-col flex-1 overflow-y-scroll w-full overflow-x-hidden">
            <div className="flex flex-col p-1 py-5 items-center justify-center border-b">
              <TeleoscopeLogo
                compact={compact}
                color={logoColor}
                hoverColor={logoHoverColor}
                textDecorationColor={logoTextDecorationColor}
              />
              <TopBar
                compact={compact}
                label={workspace.label}
                team={workspace.team}
                color={topBarColor}
              />
            </div>
            {/* <Accordion compact={false}></Accordion> */}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}
