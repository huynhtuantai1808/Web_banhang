/**
 * Chatbot ở đây hoạt động theo kiểu "rule-based FAQ" (đối sánh từ khoá) — KHÔNG gọi AI/LLM nào,
 * phù hợp cho việc trả lời nhanh các câu hỏi thường gặp mà không cần chi phí API. Nếu muốn nâng
 * cấp lên chatbot AI thật (hiểu ngôn ngữ tự nhiên), có thể thay hàm `findBestReply` bằng 1 lệnh gọi
 * API tới dịch vụ AI bạn chọn (OpenAI, Anthropic Claude, Gemini...).
 *
 * Cách hoạt động: mỗi mục có `keywords` (từ khoá tiếng Việt không dấu, chữ thường) — tin nhắn
 * khách gõ vào cũng được chuẩn hoá tương tự rồi so khớp xem chứa từ khoá nào, mục có nhiều từ
 * khoá khớp nhất sẽ được chọn để trả lời.
 */

export interface FaqEntry {
  keywords: string[];
  reply: string;
  quickLabel: string; // nhãn ngắn hiển thị dạng nút gợi ý nhanh
}

/** Bỏ dấu tiếng Việt + chuyển chữ thường, để so khớp từ khoá không phân biệt dấu. */
export function normalizeVietnamese(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    quickLabel: "Thời gian giao hàng?",
    keywords: ["giao hang", "van chuyen", "ship", "bao lau", "khi nao nhan"],
    reply:
      "Đơn hàng nội thành thường giao trong 1-2 ngày, ngoại thành/tỉnh khác từ 2-4 ngày làm việc. " +
      "Bạn có thể xem tình trạng vận chuyển chi tiết ở mục 'Đơn hàng của tôi' sau khi đăng nhập.",
  },
  {
    quickLabel: "Chính sách đổi trả?",
    keywords: ["doi tra", "tra hang", "hoan tien", "bao hanh loi"],
    reply:
      "Sản phẩm được đổi trả trong 7 ngày nếu còn nguyên hộp, tem, phụ kiện và chưa kích hoạt bảo " +
      "hành, hoặc do lỗi nhà sản xuất. Vui lòng liên hệ hotline để được hướng dẫn quy trình đổi trả cụ thể.",
  },
  {
    quickLabel: "Trả góp thế nào?",
    keywords: ["tra gop", "0%", "lai suat", "tra thang"],
    reply:
      "Chúng tôi hỗ trợ trả góp 0% lãi suất, chia 3/6/9/12 tháng, áp dụng cho các sản phẩm có gắn " +
      "nhãn hỗ trợ trả góp. Chọn 'Trả góp' ngay ở bước thanh toán để xem số tiền mỗi tháng.",
  },
  {
    quickLabel: "Bảo hành bao lâu?",
    keywords: ["bao hanh", "warranty", "hong may", "sua chua"],
    reply:
      "Thời gian bảo hành theo chính sách hãng (thường 12-24 tháng tuỳ sản phẩm), xem chi tiết ở " +
      "mô tả từng sản phẩm. Mang máy + hoá đơn tới cửa hàng hoặc liên hệ hotline để được hỗ trợ bảo hành.",
  },
  {
    quickLabel: "Cách dùng mã khuyến mãi?",
    keywords: ["khuyen mai", "ma giam gia", "voucher", "coupon"],
    reply:
      "Ở bước thanh toán, nhập mã khuyến mãi vào ô 'Nhập mã khuyến mãi' rồi bấm Áp dụng. Một số mã " +
      "chỉ dành riêng cho tài khoản được cấp — nếu báo lỗi không dùng được, có thể mã đó không áp dụng cho bạn.",
  },
  {
    quickLabel: "Thanh toán online có an toàn?",
    keywords: ["thanh toan", "vnpay", "an toan", "the ngan hang", "atm"],
    reply:
      "Thanh toán online qua VNPay được mã hoá và xử lý trực tiếp bởi VNPay, cửa hàng không lưu " +
      "thông tin thẻ của bạn. Bạn cũng có thể chọn thanh toán khi nhận hàng (COD) nếu muốn.",
  },
];

const FALLBACK_REPLY =
  "Mình chưa chắc hiểu câu hỏi này 🙏. Bạn có thể chọn 1 câu hỏi gợi ý bên dưới, hoặc gọi hotline / " +
  "nhắn Zalo, Facebook để được nhân viên hỗ trợ trực tiếp nhé!";

export function findBestReply(userMessage: string): string {
  const normalizedMessage = normalizeVietnamese(userMessage);

  let bestEntry: FaqEntry | null = null;
  let bestScore = 0;

  for (const entry of FAQ_ENTRIES) {
    const score = entry.keywords.filter((kw) => normalizedMessage.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  return bestEntry ? bestEntry.reply : FALLBACK_REPLY;
}
