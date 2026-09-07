"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Truck, AlertTriangle } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function OrderResultPage() {
  return (
    <Suspense fallback={null}>
      <OrderResultContent />
    </Suspense>
  );
}

function OrderResultContent() {
  const searchParams = useSearchParams();
  const payment = searchParams.get("payment"); // success | failed | invalid | not_found | cod
  const orderCode = searchParams.get("order_code");

  const content = {
    success: {
      icon: <CheckCircle2 size={48} className="text-circuit-signal" />,
      title: "Thanh toán thành công!",
      desc: "Đơn hàng của bạn đã được xác nhận và đang được chuẩn bị.",
    },
    cod: {
      icon: <Truck size={48} className="text-circuit-signal" />,
      title: "Đặt hàng thành công!",
      desc: "Đơn hàng sẽ được giao tới bạn, thanh toán khi nhận hàng (COD).",
    },
    failed: {
      icon: <XCircle size={48} className="text-red-400" />,
      title: "Thanh toán thất bại",
      desc: "Giao dịch không thành công. Bạn có thể thử lại hoặc chọn phương thức khác.",
    },
    invalid: {
      icon: <AlertTriangle size={48} className="text-red-400" />,
      title: "Không xác thực được giao dịch",
      desc: "Chữ ký từ cổng thanh toán không hợp lệ. Vui lòng liên hệ hỗ trợ nếu bạn đã bị trừ tiền.",
    },
    not_found: {
      icon: <AlertTriangle size={48} className="text-red-400" />,
      title: "Không tìm thấy đơn hàng",
      desc: "Đơn hàng tương ứng không tồn tại trong hệ thống.",
    },
  } as const;

  const info = content[(payment as keyof typeof content) || "failed"] || content.failed;

  const [orderInfo, setOrderInfo] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("lastOrderInfo");
      if (stored) setOrderInfo(JSON.parse(stored));
    } catch (e) {}
  }, []);

  return (
    
    <div className="min-h-screen flex flex-col bg-circuit-bg text-circuit-text">
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-6 py-16 text-center">

      <div className="mt-10 flex flex-col items-center rounded-lg border border-circuit-line bg-circuit-panel p-10">
        {info.icon}
        <h1 className="font-display text-2xl text-circuit-text mt-4">{info.title}</h1>
        <p className="text-circuit-muted mt-2">{info.desc}</p>
        {orderCode && (
          <p className="font-mono text-sm text-circuit-copperLight mt-4">Mã đơn hàng: {orderCode}</p>
        )}

        {orderInfo && (
          <div className="w-full mt-8 p-6 rounded-xl border border-circuit-line/60 bg-circuit-bg/30 text-left">
            <h3 className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest font-semibold mb-4">Chi tiết đơn hàng</h3>
            <div className="space-y-3 border-b border-circuit-line/40 pb-4 mb-4">
              {orderInfo.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-circuit-text font-medium pr-4">
                    {item.name || item.product_name || "Sản phẩm"} <span className="text-circuit-muted font-mono ml-2">× {item.quantity}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-circuit-muted">
                <span>Tổng tiền:</span>
                <span className="font-mono">{(orderInfo.total).toLocaleString("vi-VN")}₫</span>
              </div>
              {orderInfo.discount > 0 && (
                <div className="flex justify-between text-circuit-signal">
                  <span>Khuyến mãi giảm:</span>
                  <span className="font-mono">-{(orderInfo.discount).toLocaleString("vi-VN")}₫</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-8">
          <Link
            href="/"
            className="rounded-md border border-circuit-line px-5 py-2.5 text-sm text-circuit-text hover:border-circuit-copper transition-colors"
          >
            Về trang chủ
          </Link>
          <Link
            href="/orders"
            className="rounded-md bg-circuit-copper px-5 py-2.5 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors"
          >
            Xem đơn hàng của tôi
          </Link>
        </div>
      </div>
    </main>
      <SiteFooter />
    </div>
  );
}
