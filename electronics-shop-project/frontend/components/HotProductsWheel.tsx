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
  const innerRadius = size * 0.32; // Tăng kích thước vùng ảnh trung tâm (từ 0.25 -> 0.32)

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
      {/* Background with active product image (blurred/darkened) */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-xl scale-110 opacity-40 transition-all duration-1000"
          style={{ backgroundImage: `url(${activeProduct.imageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
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
                {/* Nền trắng giúp ảnh sản phẩm trong và dễ nhìn hơn, nhất là ảnh có viền trắng */}
                <circle cx="200" cy="200" r={innerRadius - 2} fill="#ffffff" stroke="#30df93" strokeWidth="2" />
                <image
                  href={activeProduct.imageUrl}
                  x={200 - (innerRadius - 8)}
                  y={200 - (innerRadius - 8)}
                  width={(innerRadius - 8) * 2}
                  height={(innerRadius - 8) * 2}
                  clipPath="url(#center-circle)"
                  preserveAspectRatio="xMidYMid meet" // Chuyển từ slice sang meet để ảnh không bị cắt xén
                />
              </g>
            </svg>
          </div>
        </div>

        {/* Right side: Product Info */}
        <div className="w-full md:w-1/2 p-6 md:p-12 flex flex-col justify-center">
          <div className="space-y-6">
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-white font-bold drop-shadow-md">
              {activeProduct.name}
            </h2>
            <div className="text-gray-300 text-sm md:text-base leading-relaxed max-w-xl line-clamp-3">
              {activeProduct.specHighlight}
            </div>
            <div className="flex items-center gap-4">
              {activeProduct.discountPrice ? (
                <>
                  <span className="font-display text-3xl md:text-4xl text-circuit-signal font-bold">
                    {activeProduct.discountPrice.toLocaleString("vi-VN")}₫
                  </span>
                  <span className="text-gray-400 line-through text-lg">
                    {activeProduct.price.toLocaleString("vi-VN")}₫
                  </span>
                </>
              ) : (
                <span className="font-display text-3xl md:text-4xl text-circuit-signal font-bold">
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
