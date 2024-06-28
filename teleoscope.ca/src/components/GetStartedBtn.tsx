"use client";
import Link from "next/link";
import { useState } from "react";
import HoverBtnEffect from "./HoverButtonEffect";

const starAsset = "/assets/TeleoscopeStars.svg";

export default function GetStartedBtn() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="flex items-center justify-between relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        href="/signup"
        className="flex items-center justify-between gap-4 border-2 border-primary bg-primary duration-300 hover:border-appPrimary-100 text-white rounded-full p-1 px-4 font-medium hover:bg-primary-600"
      >
        Get Started
      </Link>
      <HoverBtnEffect isHovered={isHovered} />

    </div>
  );
}
