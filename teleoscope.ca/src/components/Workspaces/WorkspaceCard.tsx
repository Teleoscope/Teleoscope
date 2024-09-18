import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { WorkspaceSettings } from '../Workspaces/WorkspaceModal';
import { ObjectId } from 'mongodb';
import { useSWRF } from '@/lib/swr';
import { WorkspaceCollaboratorsModal } from './WorkspaceCollaboratorsModal';

export const WorkspaceCard = ({
    workspaceId
}: {
    workspaceId: string | ObjectId;
}) => {
    const {
        data: workspace,
        error,
        isLoading
    } = useSWRF(workspaceId ? `/api/workspace?workspace=${workspaceId}` : null);

    if (error || isLoading) {
        return <>Loading...</>;
    }

    return (
        <Card className=" relative flex-shrink-0 flex flex-col border-none shadow-none  overflow-hidden bg-transparent ">
            <CardContent className="p-0 flex flex-col flex-1 justify-center items-center min-w-40 min-h-40  h-40 w-44 relative flex-shrink-0  bg-white shadow overflow-hidden border  rounded-lg ">
                <Link
                    href={`/workspace/${workspace._id}`}
                    className=" font-bold flex items-center p-0 from-appPrimary-50 to-zinc-50 bg-gradient-to-br bg-opacity-50 h-full w-full flex-1"
                >
                    <div className="text-md p-0 font-semibold w-full justify-center flex items-center gap-1 ">
                        {workspace.label}
                    </div>
                </Link>
            </CardContent>
            <CardFooter className="flex items-center  w-full justify-between p-0 gap-1 py-1">
                <WorkspaceCollaboratorsModal
                    id={workspace._id}
                    name={workspace.label}
                    contributors={workspace.contributors || []}
                />

                <div className="flex flex-col bg-white shadow-sm  border w-8 h-8 justify-center items-center  rounded-full px-2 py-1">
                    <WorkspaceSettings
                        id={workspace._id}
                        name={workspace.label}
                    />
                </div>
            </CardFooter>
        </Card>
    );
};
