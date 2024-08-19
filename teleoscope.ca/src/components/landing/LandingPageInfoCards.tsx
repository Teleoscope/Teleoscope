import InfoCard from "./InfoCard";
import { featureList } from "./data/FeatureList";

export default function LandingPageInfoCards() {
  return (
    <div className="flex flex-col items-center gap-4 w-full ">
      {featureList.map((card) => (
        <InfoCard key={card.title} {...card} />
      ))}
    </div>
  );
}