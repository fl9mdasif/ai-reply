"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

export default function Navbar() {
  const t = useTranslations();
  const locale = useLocale();
  const otherLocale = locale === "en" ? "bn" : "en";
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    t("nav.features"),
    t("nav.pricing"),
    t("nav.howItWorks"),
    t("nav.contact"),
  ];
  const navAnchors = ["#features", "#pricing", "#how-it-works", "#contact"];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      <div
        className="backdrop-blur-md border-b border-white/5"
        style={{ background: "rgba(0,0,0,0.85)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href={`/${locale}`} className="text-white font-bold text-xl tracking-tight">
            <span className="text-[#C6FF33]">j</span>obabai
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link, i) => (
              <a
                key={i}
                href={navAnchors[i]}
                className="text-white/70 hover:text-white text-sm transition-colors"
              >
                {link}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={`/${otherLocale}`}
              className="hidden sm:block text-white/60 hover:text-white text-sm transition-colors"
            >
              {t("nav.langToggle")}
            </Link>
            <a
              href="#cta"
              className="bg-[#C6FF33] text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#d4ff55] transition-colors"
            >
              {t("nav.cta")}
            </a>
            <button
              className="md:hidden text-white"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden"
            style={{ background: "rgba(0,0,0,0.95)", backdropFilter: "blur(12px)" }}
          >
            <div className="px-4 py-4 flex flex-col gap-4">
              {navLinks.map((link, i) => (
                <a
                  key={i}
                  href={navAnchors[i]}
                  className="text-white/80 text-base"
                  onClick={() => setMenuOpen(false)}
                >
                  {link}
                </a>
              ))}
              <Link href={`/${otherLocale}`} className="text-white/60 text-sm">
                {t("nav.langToggle")}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
