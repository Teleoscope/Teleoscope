import Image from "next/image";

export type SubItem = {
  title: string;
  description: string;
};

export type InfoCardProps = {
  title: string;
  subItems: SubItem[];
  graphic: string;
};

export default function InfoCard({ title, subItems, graphic }: InfoCardProps) {
  return (
    <div className={`flex flex-col items-center gap-4 w-full max-w-3xl pb-5`}>
      <div className="flex gap-10 items-center w-full">
        <Image
          src={`/graphics/icons/${graphic}`}
          alt={title}
          width={80}
          height={80}
          unoptimized
        />
        <span id={title} className="text-3xl font-bold w-full">
          {title}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 w-full py-2 pb-5">
        <div className="flex flex-col items-center gap-10 w-full ">
          {subItems.map((item) => (
            <div key={item.title} className="flex w-full gap-5 lg:pl-32">
              <div className="flex flex-col gap-4 max-w-3xl">
                <span className="text-xl font-medium">{item.title}</span>
                <span className="text-md">{item.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
