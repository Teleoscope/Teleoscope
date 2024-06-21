import { InfoIcon } from "lucide-react";
import { featureList } from "./FeatureList";

export type SubItem = {
    title : string;
    description: string;
    icon: string;
}

export type InfoCardProps = {
    title: string;
    subItems: SubItem[];
    graphic: string;
}

export default function InfoCards() {
    return (
        <div className="flex flex-col items-center gap-4 w-full py-10 ">
            {featureList.map((card) => (
                <InfoCard key={card.title} {...card}/>
            ))}
        </div>
    );
}

function InfoCard({title, subItems, graphic}: InfoCardProps) {
    return (
        <div className="flex flex-col items-center gap-4 w-full max-w-5xl pb-10">
            <span id={title} className="text-2xl font-bold w-full">{title}</span>
             <div className="grid grid-cols-2 gap-4 w-full border-b py-2">
                <div className="flex flex-col items-center gap-4 w-2/3">            
                 {subItems.map((item) => (
                     <div key={item.title} className="flex w-full gap-5">
                        <InfoIcon size={20} className="h-5 w-5 bg-neutral-50 rounded-sm border-none flex-shrink-0"/>
                         {/* <img src={item.icon} alt={"i"} className="h-8 w-8 bg-neutral-50 rounded-sm border-none flex-shrink-0"/> */}
                         <div className="flex flex-col  gap-4">
                         <span className="text-lg font-medium">{item.title}</span>
                         <span className="text-sm">{item.description}</span>
                         </div>
                     </div>
                 ))}
                </div>
                <img src={graphic} alt={title} className="h-96 w-[400px] bg-neutral-50 rounded-sm"/>
            </div>
        </div>
    );
}
