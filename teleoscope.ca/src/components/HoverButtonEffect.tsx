"use client";
import Image from "next/image";
import { cn } from "@/lib/utils";

const starAsset = "/assets/TeleoscopeStars.svg";

export default function HoverBtnEffect({ isHovered }: { isHovered: boolean }) {
  const isHoveredCondition = isHovered ? "opacity-100" : "opacity-0";

  return (
    <div className="absolute  z-30 h-full bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
      <Image
        src={starAsset}
        alt="star"
        width={15}
        height={4}
        className={cn(
          "right-0  transform rotate-90  translate-y-5 transition-opacity duration-300",
          isHoveredCondition
        )}
      />
      <Image
        src={starAsset}
        alt="star"
        width={20}
        height={10}
        className={cn(
          "right-0 bottom-0 transform rotate-180 translate-x-10 translate-y-4 transition-opacity duration-500",
          isHoveredCondition
        )}
      />

      <Image
        src={starAsset}
        alt="star"
        width={20}
        height={8}
        className={cn(
          "right-0 transform rotate-90 translate-x-16 -translate-y-12 transition-opacity duration-600",
          isHoveredCondition
        )}
      />

      <Image
        src={starAsset}
        alt="star"
        width={15}
        height={10}
        className={cn(
          "top-0 right-0 duration-300 transform rotate-90 -translate-x-10 -translate-y-20",
          isHoveredCondition
        )}
      />

      <Image
        src={starAsset}
        alt="star"
        width={15}
        height={10}
        className={cn(
          "top-0 right-0 duration-300 transform rotate-90 -translate-x-10 -translate-y-8",
          isHoveredCondition
        )}
      />
    </div>
  );
}
