"use client";
import { useState } from "react";
import HoverBtnEffect from "./HoverButtonEffect";

const demoCTAHref = "mailto:hello@teleoscope.ca";

export default function DemoButton() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="flex relative items-center justify-center w-full  p-4">
      <div
        className="flex relative items-center justify-center w-fit  p-4"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <a
          href={demoCTAHref}
          target="_blank"
          rel="noreferrer"
          className="bg-primary hover:shadow-xl duration-300 text-white rounded-full p-2 px-4 font-medium hover:bg-primary-600"
        >
          Book a demo
        </a>
      </div>
      <HoverBtnEffect isHovered={isHovered} />
    </div>
  );
}
