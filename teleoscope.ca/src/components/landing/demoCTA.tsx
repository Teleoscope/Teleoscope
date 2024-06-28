import Image from "next/image";

const demoCTAHref = "mailto:hello@teleoscope.ca";
const demoText =
  "Ready to see Teleoscope first hand? Schedule a demo with our team to discover how Teleoscope can empower your team.";

export default function DemoCTA() {
  return (
    <div className="flex justify-center items-center w-full gap-8 py-60 relative overflow-hidden ">
      <Image
        src={"/graphics/hero5.svg"}
        alt="Logo"
        fill
        className=" animate-pulse delay-500 duration-10000"
      />

      <Image
        src={"/graphics/hero4.svg"}
        alt="Logo"
        fill
        className=" animate-pulse delay-1000 duration-20000"
      />
      <Image
        src={"/graphics/hero3.svg"}
        alt="Logo"
        fill
        className=" opacity-70 delay-500 duration-10000"
      />

      <div className="flex justify-center items-center absolute  overflow-visible w-full "></div>
      <div className="flex flex-col gap-8   max-w-xl rounded-xl w-full p-10 px-20 z-10">
        <div className="text-lg md:text-xl font-medium">
          <p>{demoText}</p>
        </div>
        <div className="flex items-center justify-center p-4">
          <a
            href={demoCTAHref}
            target="_blank"
            rel="noreferrer"
            className="bg-primary hover:bg-secondary text-white rounded-full p-2 px-4 font-medium hover:bg-primary-600"
          >
            Book a demo
          </a>
        </div>
      </div>
    </div>
  );
}
