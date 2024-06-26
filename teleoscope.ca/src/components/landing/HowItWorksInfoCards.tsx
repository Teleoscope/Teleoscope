import InfoCard from "./InfoCard";
import { workList } from "./data/HowItWorks";

export default function HowItWorksInfoCards() {
  return (
    <div className="flex flex-col items-center gap-4 w-full ">
      {workList.map((card) => (
        <InfoCard key={card.title} {...card} />
      ))}
    </div>
  );
}