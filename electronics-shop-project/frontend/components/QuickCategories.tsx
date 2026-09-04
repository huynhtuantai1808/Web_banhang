"use client";

import Link from "next/link";
import { Smartphone, Laptop, Watch, Headphones, Camera, Tablet, HardDrive, Shell, Sparkles } from "lucide-react";
import React from "react";

const QUICK_LINKS = [
  { name: "iPhone 17 Pro Max", icon: Smartphone },
  { name: "iPhone 17e", icon: Smartphone },
  { name: "iPhone 17", icon: Smartphone },
  { name: "iPhone Air", icon: Smartphone },
  { name: "iPhone 16 Series", icon: Smartphone },
  { name: "Ốp lưng PITAKA", icon: Shell },
  { name: "Ốp lưng iPhone 17", icon: Shell },
  { name: "Cường lực", icon: Sparkles },
  { name: "iPad", icon: Tablet },
  { name: "Apple Watch", icon: Watch },
  { name: "AirPods", icon: Headphones },
  { name: "MacBook", icon: Laptop },
  { name: "MacBook Neo", icon: Laptop },
  { name: "Galaxy Z Series", icon: Smartphone },
  { name: "Điện thoại Android", icon: Smartphone },
  { name: "Thiết bị lưu trữ", icon: HardDrive },
  { name: "Laptop", icon: Laptop },
  { name: "Đồng hồ thông minh", icon: Watch },
  { name: "Camera", icon: Camera },
  { name: "Loa & Âm thanh", icon: Headphones },
  { name: "iPhone Cũ", icon: Smartphone },
];

export default function QuickCategories() {
  return (
    <div className="bg-gray-100 rounded-2xl p-4 sm:p-6 mb-8 border border-gray-200">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-7 gap-3 sm:gap-4">
        {QUICK_LINKS.map((item, i) => (
          <Link
            key={i}
            href={`/category/all?keyword=${encodeURIComponent(item.name)}`}
            className="group flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-sm border border-transparent hover:border-circuit-copper/30 hover:shadow-md transition-all duration-300"
          >
            <div className="w-12 h-12 mb-2 rounded-full bg-gray-50 flex items-center justify-center text-circuit-copper group-hover:scale-110 transition-transform duration-300">
              {React.createElement(item.icon, { size: 24, strokeWidth: 1.5 })}
            </div>
            <span className="text-xs sm:text-[13px] text-center font-medium text-gray-700 leading-tight group-hover:text-circuit-copper transition-colors">
              {item.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
