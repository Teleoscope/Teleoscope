"use client";
import { useEffect, useRef, useState } from "react";
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
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const card = cardRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );
  
    if (card) {
      observer.observe(card);
    }
  
    return () => {
      if (card) {
        observer.unobserve(card);
      }
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={`flex flex-col items-center gap-4 w-full max-w-3xl pb-5`}
    >
      <div
        className={`flex gap-10 items-center w-full transition-all duration-700 ease-out
          ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-10"
          }`}
      >
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
      <div
        className={`grid grid-cols-1 gap-4 w-full py-2 pb-5 transition-all duration-700 ease-out delay-300
          ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
      >
        <div className="flex flex-col items-center gap-10 w-full ">
          {subItems.map((item, index) => (
            <div
              key={item.title}
              className={`flex w-full gap-5 pl-32 transition-all duration-500 ease-out
                ${
                  isVisible
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-10"
                }`}
              style={{ transitionDelay: `${index * 100 + 600}ms` }}
            >
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
