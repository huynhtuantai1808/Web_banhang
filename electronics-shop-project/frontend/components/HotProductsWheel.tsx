"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getMediaUrl } from "@/lib/media";
import { Product } from "./ProductCard";

interface HotProductsWheelProps {
  products: Product[];
}

export default function HotProductsWheel({ products }: HotProductsWheelProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const numItems = products.length;
  // If no products, don't render
  if (numItems === 0) return null;

  // Auto rotate every 10 seconds
  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, [numItems]);

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % numItems);
    }, 10000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSelect = (index: number) => {
    setActiveIndex(index);
    startTimer(); // reset timer
  };

  const activeProduct = products[activeIndex];

  // Calculate SVG paths for segments
  const size = 400; // SVG viewBox size
  const center = size / 2;
  const radius = size / 2;
  const innerRadius = size * 0.22; // Thu nhỏ lại vùng ảnh trung tâm theo yêu cầu

  const createSegmentPath = (index: number, total: number) => {
    const angleStep = (Math.PI * 2) / total;
    // Offset by -90 deg so the first item starts at the top
    const startAngle = index * angleStep - Math.PI / 2;
    const endAngle = (index + 1) * angleStep - Math.PI / 2;

    // Calculate gap
    const gap = 0.05; // gap in radians
    const sAngle = startAngle + gap;
    const eAngle = endAngle - gap;

    const x1 = center + radius * Math.cos(sAngle);
    const y1 = center + radius * Math.sin(sAngle);
    const x2 = center + radius * Math.cos(eAngle);
    const y2 = center + radius * Math.sin(eAngle);

    const x3 = center + innerRadius * Math.cos(eAngle);
    const y3 = center + innerRadius * Math.sin(eAngle);
    const x4 = center + innerRadius * Math.cos(sAngle);
    const y4 = center + innerRadius * Math.sin(sAngle);

    // large arc flag
    const largeArc = eAngle - sAngle > Math.PI ? 1 : 0;

    return `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;
  };

  return (
    <section className="relative w-full h-[500px] overflow-hidden bg-slate-900 text-white rounded-2xl">
      {/* Background with active product image (faded on the left to prevent sharp edges and text overlap) */}
      <div className="absolute inset-y-0 right-0 w-3/4 md:w-1/2 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 bg-contain bg-right bg-no-repeat transition-all duration-1000"
          style={{ 
            backgroundImage: `url(${activeProduct.imageUrl})`,
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 20%, black 70%, black 100%)',
            maskImage: 'linear-gradient(to right, transparent 0%, transparent 20%, black 70%, black 100%)',
            opacity: 0.95
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto h-full flex flex-col md:flex-row items-center">
        {/* Left side: Segmented Circle */}
        <div className="w-full md:w-1/2 flex justify-start items-center -ml-20 md:-ml-24 lg:-ml-10">
          <div className="relative w-[350px] h-[350px] md:w-[450px] md:h-[450px]">
            <svg
              viewBox="0 0 400 400"
              className="w-full h-full drop-shadow-2xl transition-transform duration-1000"
              style={{ transform: `rotate(-${(360 / numItems) * activeIndex}deg)` }}
            >
              <defs>
                <clipPath id="center-circle">
                  <circle cx="200" cy="200" r={innerRadius - 4} />
                </clipPath>
                {products.map((p, i) => (
                  <pattern
                    key={`pat-${i}`}
                    id={`image-fill-${i}`}
                    patternUnits="userSpaceOnUse"
                    width="400"
                    height="400"
                    patternTransform={`rotate(${(360 / numItems) * i})`}
                  >
                    <image
                      href={p.imageUrl}
                      x="0"
                      y="0"
                      width="400"
                      height="400"
                      preserveAspectRatio="xMidYMid slice"
                    />
                  </pattern>
                ))}
              </defs>

              {products.map((p, i) => {
                const isActive = i === activeIndex;
                const path = createSegmentPath(i, numItems);

                return (
                  <g
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => handleSelect(i)}
                    style={{ transformOrigin: "200px 200px" }}
                  >
                    <path
                      d={path}
                      fill={`url(#image-fill-${i})`}
                      className={`transition-all duration-300 ${
                        isActive ? "opacity-100" : "opacity-50 hover:opacity-80"
                      }`}
                      stroke={isActive ? "#30df93" : "#333"}
                      strokeWidth={isActive ? "2" : "1"}
                    />
                    {/* Dark overlay for inactive */}
                    {!isActive && (
                      <path
                        d={path}
                        fill="rgba(0,0,0,0.5)"
                        className="pointer-events-none transition-all duration-300 hover:opacity-0"
                      />
                    )}
                  </g>
                );
              })}
              
              {/* Center image (replaces number) */}
              <g style={{ transform: `rotate(${(360 / numItems) * activeIndex}deg)`, transformOrigin: "200px 200px" }} className="transition-transform duration-1000">
                <circle cx="200" cy="200" r={innerRadius - 2} fill="transparent" stroke="#30df93" strokeWidth="2" />
                <image
                  href={activeProduct.imageUrl}
                  x={200 - (innerRadius - 2)}
                  y={200 - (innerRadius - 2)}
                  width={(innerRadius - 2) * 2}
                  height={(innerRadius - 2) * 2}
                  clipPath="url(#center-circle)"
                  preserveAspectRatio="xMidYMid slice"
                />
              </g>
            </svg>
          </div>
        </div>

        <div className="w-full md:w-1/2 p-6 md:p-12 flex flex-col justify-center relative z-20">
          <div className="space-y-6 max-w-xl">
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-white font-bold drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
              {activeProduct.name}
            </h2>
            <div className="text-gray-200 text-sm md:text-base leading-relaxed line-clamp-3 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              {activeProduct.specHighlight}
            </div>
            <div className="flex items-center gap-4">
              {activeProduct.discountPrice ? (
                <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-4 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  <span className="font-display text-3xl md:text-4xl text-circuit-signal font-bold">
                    {activeProduct.discountPrice.toLocaleString("vi-VN")}₫
                  </span>
                  <span className="text-gray-300 line-through text-lg pb-1">
                    {activeProduct.price.toLocaleString("vi-VN")}₫
                  </span>
                </div>
              ) : (
                <span className="font-display text-3xl md:text-4xl text-circuit-signal font-bold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  {activeProduct.price.toLocaleString("vi-VN")}₫
                </span>
              )}
            </div>
            
            <div className="pt-6">
              <Link
                href={`/products/${activeProduct.id}`}
                className="inline-flex items-center gap-2 bg-circuit-copper text-circuit-bg px-6 py-3 rounded-xl font-semibold hover:bg-circuit-copperLight transition-all duration-300 hover:scale-105"
              >
                Xem chi tiết <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
