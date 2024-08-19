import Image from "next/image";

const demoCTAHref = "mailto:hello@teleoscope.ca";
const demoText = "Ready to see Teleoscope first hand? Schedule a demo with our team and discover how Teleoscope can empower your team.";

export default function DemoCTA() {
  return (
    <div className="flex justify-center items-center w-full gap-8 py-60  ">
        <div className="flex justify-center items-center w-screen h-[60vh] absolute overflow-visible opacity-80 ">
        <Image
            src={"/graphics/hero.svg"}
            alt="Logo"
            fill
            className="animate-pulse delay-300 duration-5000"
        />
         <Image
            src={"/graphics/hero2.svg"}
            alt="Logo"
            fill
            className="animate-pulse delay-500 duration-5000"
        />
        </div>
      <div className="flex flex-col gap-8   max-w-3xl rounded-xl w-full p-10 px-20 z-10">
        <div className="text-xl font-medium">
          <p>{demoText}</p>
        </div>
        <div className="flex items-center justify-center p-4">
          <a href={demoCTAHref} target="_blank" rel="noreferrer" className="bg-black text-white rounded-full p-2 px-4 font-medium hover:bg-primary-600">
           Book a demo
          </a>
        </div>
      </div>
    </div>
  );
}
