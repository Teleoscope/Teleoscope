'use client';;
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup
} from '@/components/ui/resizable';
import TopBar from '@/components/Sidebar/TopBar';
import TeleoscopeLogo from '@/components/TeleoscopeLogo';
import {
    DEFAULT_DRAWER_WIDTH,
    DEFAULT_GREY,
    DEFAULT_MIN_WIDTH
} from '@/lib/defaults';
import SidebarAccordion from './Sidebar/Accordion';
import { useAppSelector } from '@/lib/hooks';
import { AppState } from '@/services/app';
import Workflow from './Workflow/Workflow';
import HelpOverlay from './HelpOverlay';
import { loadAppData } from '@/actions/appState';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSWRF } from '@/lib/swr';

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
    drawerWidth = DEFAULT_DRAWER_WIDTH,
    minWidth = DEFAULT_MIN_WIDTH,
    logoColor = DEFAULT_GREY,
    logoHoverColor = DEFAULT_GREY,
    logoTextDecorationColor,
    topBarColor = DEFAULT_GREY,
    compact = false
}: WorkspaceProps) {

    // const { data: app, error, isLoading  } = useLoadWorkspaceQuery(workspace_id)
    const { data: app, error, isLoading  } = useSWRF(`/api/app?workspace=${workspace_id}`)
    const dispatch = useDispatch();

    useEffect(() => {
        if (app) {
          dispatch(loadAppData({ state: app }));
        }
      }, [app, dispatch]);
    

    const { workspace, workflow }: AppState = useAppSelector(
        (state) => state.appState
    );

    if (!workflow || !workspace) {
        return <>Loading...</>;
    }

    return (
        <div className="h-dvh" >
            <HelpOverlay />
            <ResizablePanelGroup
                direction="horizontal"
                className="flex flex-row overflow-hidden"

            >
                <ResizablePanel
                    className="flex flex-col shadow-sm bg-white border w-full"
                    maxSize={100}
                    defaultSize={10}
                    collapsible={true}
                >
                    <Workflow />
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
                                team={workspace.team + ''}
                                color={topBarColor}
                            />
                        </div>
                        <SidebarAccordion compact={false} />
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
