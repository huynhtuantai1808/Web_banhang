"use client";

import { Search } from "lucide-react";
import { useState } from "react";

export default function SearchBar({ onSearch }: { onSearch?: (keyword: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch?.(value);
      }}
      className="flex items-center gap-3 rounded-2xl border border-circuit-line/60 bg-circuit-panel/60 backdrop-blur-md px-5 py-3 focus-within:border-circuit-copper focus-within:shadow-[0_0_15px_rgba(200,127,69,0.2)] transition-all duration-300 w-full group"
    >
      <Search size={20} className="text-circuit-muted group-focus-within:text-circuit-copperLight transition-colors" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tìm điện thoại, laptop, tablet, PC gaming..."
        className="flex-1 bg-transparent outline-none text-sm text-circuit-text placeholder:text-circuit-muted"
      />
    </form>
  );
}
