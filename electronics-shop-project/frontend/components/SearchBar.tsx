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
      className="flex items-center gap-2 rounded-full border border-circuit-line bg-circuit-panel px-4 py-2.5 focus-within:border-circuit-copper transition-colors"
    >
      <Search size={18} className="text-circuit-muted" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tìm điện thoại, laptop, tablet, PC gaming..."
        className="flex-1 bg-transparent outline-none text-sm text-circuit-text placeholder:text-circuit-muted"
      />
    </form>
  );
}
