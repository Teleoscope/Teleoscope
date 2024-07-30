import Image from "next/image";
import { Fragment } from "react";

export default function LandingPageHero() {
  return (
    <Fragment>
      <HeroGraphics />
      <section className="hero h-screen flex-shrink-0  z-10">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="flex flex-col items-center  h-[40vh] z-10 gap-10 ">
            <span className="text-6xl font-bold z-10 px-20 ">
              Empower Your Research with <span>AI</span>
            </span>
            <span className="text-2xl font-medium ">
              AI Assisted Qualitative Analysis
            </span>
          </div>
        </div>
      </section>
    </Fragment>
  );
}


function HeroGraphics() {
    return (
        <div className="flex justify-center items-center w-screen h-screen absolute overflow-visible ">
        <Image
            src={"/graphics/hero.svg"}
            alt="Logo"
            fill
            className="animate-pulse delay-100 duration-5000"
        />
        <Image
            src={"/graphics/hero2.svg"}
            alt="Logo"
            fill
            className="animate-pulse delay-00 duration-10000"
        />
         <Image
            src={"/graphics/hero2.svg"}
            alt="Logo"
            fill
            className="animate-pulse delay-500 duration-5000"
        />
        </div>
    );
}