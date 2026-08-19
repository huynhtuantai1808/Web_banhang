import Link from "next/link";
import { Phone, MessageCircle, Facebook, MapPin, Clock } from "lucide-react";
import { BRANDING } from "@/lib/branding";
import Logo from "@/components/Logo";

export default function SiteFooter() {
  return (
    <footer className="border-t border-circuit-line bg-circuit-panel/60 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <Logo />
          <p className="text-sm text-circuit-muted mt-3 leading-relaxed">{BRANDING.description}</p>
        </div>

        <div>
          <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest mb-3">
            Liên hệ
          </p>
          <ul className="space-y-2 text-sm text-circuit-muted">
            <li className="flex items-center gap-2">
              <Phone size={14} />
              <a href={`tel:${BRANDING.contact.hotlinePhoneRaw}`} className="hover:text-circuit-copperLight">
                {BRANDING.contact.hotlinePhone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle size={14} />
              <a href={BRANDING.contact.zaloLink} target="_blank" rel="noopener noreferrer" className="hover:text-circuit-copperLight">
                Zalo OA
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Facebook size={14} />
              <a href={BRANDING.contact.facebookLink} target="_blank" rel="noopener noreferrer" className="hover:text-circuit-copperLight">
                Fanpage Facebook
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Clock size={14} /> {BRANDING.contact.workingHours}
            </li>
          </ul>
        </div>

        <div>
          <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest mb-3">
            Hỗ trợ khách hàng
          </p>
          <ul className="space-y-2 text-sm text-circuit-muted">
            <li><Link href="/contact" className="hover:text-circuit-copperLight">Liên hệ</Link></li>
            <li><Link href="/orders/lookup" className="hover:text-circuit-copperLight">Tra cứu đơn hàng</Link></li>
            <li><Link href="/cart" className="hover:text-circuit-copperLight">Giỏ hàng</Link></li>
            <li><Link href="/login" className="hover:text-circuit-copperLight">Đăng nhập</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest mb-3">
            Địa chỉ
          </p>
          <p className="text-sm text-circuit-muted flex items-start gap-2">
            <MapPin size={14} className="shrink-0 mt-0.5" />
            Hệ thống showroom trên toàn quốc — liên hệ hotline để biết địa chỉ chi nhánh gần bạn nhất.
          </p>
        </div>
      </div>

      <div className="border-t border-circuit-line px-6 py-4 text-center text-xs text-circuit-muted">
        © {new Date().getFullYear()} {BRANDING.siteName}. Đã đăng ký bản quyền.
      </div>
    </footer>
  );
}
