"use client";
import {useUserContext} from "@/context/UserContext";
import {useCallback} from "react";
import Link from "next/link";
import {Accounts} from "@/types/accounts";

type PopUpEvent = "default plan upgrade" | "admin low on storage";
type PopUpEventProps = {
    title?: string;
    contents: string[];
    link?: string;
    linkText?: string;
}

const text: Record<PopUpEvent, PopUpEventProps> = {
    "default plan upgrade": {
        contents: ["Ready to go beyond the free plan?", "Upgrade for premium features"],
        link: "/pricing",
        linkText: "View plans"
    },
    "admin low on storage": {
        title: "Low on storage",
        contents: ["You are running out of storage.","Upgrade your plan to get more storage."],
        link: "/app/dashboard/resource-usage",
        linkText: "View resource usage"
    }
}

export default function SidebarPlanUpgradeCard()  {
    const { user, account } = useUserContext();
    const determinePopUpEvent = useCallback(({user, account}: {user: any, account: Accounts}) => {
        const LOW_STORAGE_USED_THRESHOLD_RATIO = 0.8;
        if (account.plan.name === "Default") {
            return "default plan upgrade";
        }
        const shouldNotifyUser = account.users.owner.includes(user.id) || account.users.admins?.includes(user.id)
            || account.plan.name !== "Enterprise";
        if (shouldNotifyUser && account.resources.amount_storage_used / account.plan.plan_storage_amount >= LOW_STORAGE_USED_THRESHOLD_RATIO) {
            return "admin low on storage";
        }

        return null;
    }
    , []);

    const popUpEvent = determinePopUpEvent({user, account});

    if (!popUpEvent) {
        return null;
    }

    const popUpEventText = text[popUpEvent];

    return (
        <div className={"flex p-2 gap-4"}>
        <div className="rounded-lg bg-appPrimary-50 bg-opacity-40 border w-full p-4 pb-2">
            <div className="flex flex-col w-full items-center justify-between">
                {popUpEventText.title && <h3 className="text-lg pb-4 font-semibold">{popUpEventText.title}</h3>}
                <div className={"flex flex-col gap-2"}>
                    {popUpEventText.contents.map((content, index) => (
                        <p key={index} className="text-sm text-balance  text-gray-500">
                            {content}
                        </p>
                    ))}

                </div>
                <div className="w-full flex items-center justify-center pt-2">
                    {popUpEventText.link &&
                        <Link href={popUpEventText.link} className="bg-appPrimary-600 w-full text-center  text-white px-4 py-1 rounded-md">
                            {popUpEventText.linkText}
                    </Link>}
                </div>
            </div>
        </div>
        </div>
    );
}
