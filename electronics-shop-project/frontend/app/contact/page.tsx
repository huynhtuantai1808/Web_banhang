"use client";

import { motion } from "framer-motion";
import { Phone, MessageCircle, Facebook, Clock, MapPin } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { BRANDING } from "@/lib/branding";

const CHANNELS = [
  {
    icon: Phone,
    title: "Hotline",
    value: BRANDING.contact.hotlinePhone,
    href: `tel:${BRANDING.contact.hotlinePhoneRaw}`,
    actionLabel: "Gọi ngay",
  },
  {
    icon: MessageCircle,
    title: "Zalo",
    value: "Chat trực tiếp qua Zalo OA",
    href: BRANDING.contact.zaloLink,
    actionLabel: "Mở Zalo",
  },
  {
    icon: Facebook,
    title: "Facebook",
    value: "Nhắn tin qua Fanpage",
    href: BRANDING.contact.facebookLink,
    actionLabel: "Mở Facebook",
  },
];

export default function ContactPage() {
  return (
    
    <div className="min-h-screen flex flex-col bg-circuit-bg text-circuit-text">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 rounded-xl border border-circuit-line bg-circuit-panel px-8 py-10"
      >
        <p
          className="font-mono text-sm tracking-widest uppercase mb-2"
          style={{ color: "var(--accent-color-light)" }}
        >
          // Liên hệ hỗ trợ
        </p>
        <h1 className="font-display text-3xl text-circuit-text">
          Cần tư vấn? Chúng tôi luôn sẵn sàng.
        </h1>
        <p className="text-circuit-muted mt-3 flex items-center gap-2">
          <Clock size={16} /> {BRANDING.contact.workingHours}
        </p>
      </motion.section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        {CHANNELS.map((channel, i) => {
          const Icon = channel.icon;
          return (
            <motion.a
              key={channel.title}
              href={channel.href}
              target={channel.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-lg border border-circuit-line bg-circuit-panel p-6 flex flex-col items-center text-center hover:border-circuit-copper transition-colors"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: "var(--accent-color)" }}
              >
                <Icon size={22} className="text-circuit-bg" />
              </div>
              <p className="font-display text-circuit-text">{channel.title}</p>
              <p className="text-sm text-circuit-muted mt-1">{channel.value}</p>
              <span
                className="mt-4 text-sm font-medium px-4 py-1.5 rounded-md"
                style={{ backgroundColor: "var(--accent-color)", color: "#0B1220" }}
              >
                {channel.actionLabel}
              </span>
            </motion.a>
          );
        })}
      </div>

      <div className="rounded-lg border border-circuit-line bg-circuit-panel p-6 flex items-start gap-3">
        <MapPin size={20} className="text-circuit-copperLight shrink-0 mt-0.5" />
        <div>
          <p className="text-circuit-text font-medium">{BRANDING.siteName} Store</p>
          <p className="text-sm text-circuit-muted mt-1">
            Hệ thống showroom trên toàn quốc — liên hệ hotline để được hướng dẫn địa chỉ chi nhánh
            gần bạn nhất.
          </p>
        </div>
      </div>

      <p className="text-center text-sm text-circuit-muted mt-8">
        Cần hỗ trợ nhanh? Bấm vào biểu tượng chat ở góc màn hình để trò chuyện với trợ lý ảo.
      </p>
    </main>
      <SiteFooter />
    </div>
  );
}
