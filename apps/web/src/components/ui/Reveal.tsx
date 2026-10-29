"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import { useReducedMotion } from "@/lib/motion";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export default function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduced = useReducedMotion();

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: reduced || inView ? 1 : 0,
        transform: reduced || inView ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease-out ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}
