import AccordionSection from '@/components/Sidebar/AccordionSection';
import SelectionViewer from '@/components/Sidebar/SelectionViewer';
import Workflows from './WorkflowViewer';
import Groups from '../Groups/Groups';
import Bookmarks from '../Bookmarks';
import Notes from '../Notes/Notes';
import Settings from '../Settings';
import DataHandler from './DataHandler';
import WindowDefinitions from '../WindowFolder/WindowDefinitions';
import { useAppSelector } from '@/lib/hooks';

export default function SidebarAccordion({ compact = false }) {
    const { color } = useAppSelector((state) => state.appState.workflow.settings);

    const sections = [
        { key: 'Data', component: <DataHandler/>, text: 'Upload' },
        // {
        //     key: 'References',
        //     component: <References />,
        //     text: 'References',
        //     condition:
        //         selection.nodes.length > 0 &&
        //         selection.nodes.some((n: Node) => n.data.type === 'Document')
        // },
        { key: 'Workflows', component: <Workflows />, text: 'Workflows' },
        { key: 'Groups', component: <Groups />, text: 'Groups' },
        { key: 'Bookmarks', component: <Bookmarks />, text: 'Bookmarks' },
        { key: 'Notes', component: <Notes />, text: 'Notes' },
        { key: 'Settings', component: <Settings />, text: 'Settings' }
    ];

    return (
        <div className="flex flex-col flex-1 w-full overflow-x-hidden text-black">
            <SelectionViewer />

            <div className="flex flex-col w-full">
                {sections.map(({ key, component, text, condition }) => {
                    if (condition !== false) {
                        const def = WindowDefinitions(key)
                        const icon = def ? def.icon(color) : <></>
                        return (
                            <AccordionSection
                                key={key}
                                compact={compact}
                                icon={icon}
                                text={text}
                            >
                                {component}
                            </AccordionSection>
                        );
                    }
                })}
            </div>
        </div>
    );
}
