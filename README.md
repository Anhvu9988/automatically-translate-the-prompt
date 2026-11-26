# Codeforces Vietnam Translator 🇻🇳

Tiện ích VS Code gọn nhẹ, chuyên biệt dành cho lập trình thi đấu (Competitive Programming): **Chỉ cần nhập mã bài Codeforces, tiện ích sẽ tự động lấy bài về và dịch sang Tiếng Việt với công thức toán học được bảo toàn 100%!**

---

## 🎯 Tính năng chính

1. **Nhập mã bài — Tải đề nhanh chóng**:
   - Nhập mã bài ngắn gọn: `2044A`, `1900B`, `4A`, `1234/C` hoặc dán thẳng đường dẫn URL bài tập.
2. **Bảo toàn 100% công thức toán học**:
   - Tất cả các biểu thức LaTeX/KaTeX: `$n$`, `$(a, b)$`, `$1 \le t \le 10^5$`, $\sum$, $\gcd$, ma trận, công thức phân số... được che chắn token bảo mật, giữ nguyên định dạng toán học gốc, không bị biến dạng hay dịch sai.
3. **Giao diện đọc đề trực quan (KaTeX Webview)**:
   - Hiển thị đề bài bằng tiếng Việt với font toán học sắc nét ngay trong VS Code.
   - Nút chuyển đổi mượt mà giữa **🇻🇳 Tiếng Việt** và **🇬🇧 Tiếng Anh gốc**.
   - Nút **Copy Input** nhanh chóng cho từng test case mẫu.
   - Nút **Sao chép Markdown** để lưu lại hoặc chia sẻ.
4. **Lưu trữ Markdown tiện lợi**:
   - Tự động tạo tệp `problem_vi.md` và `problem_en.md` trong thư mục workspace để lưu trữ và đọc offline.

---

## 🚀 Cách sử dụng

1. Bấm vào nút **`$(book) CF: Dịch đề bài`** ở thanh trạng thái (Status Bar ở góc dưới VS Code) hoặc bấm **`Ctrl+Shift+P`** $\rightarrow$ chọn **`Codeforces: Lấy bài tập & Dịch sang Tiếng Việt`**.
2. Nhập mã bài Codeforces (ví dụ `2044A`) $\rightarrow$ Nhấn **Enter**.
3. Cửa sổ đọc đề Tiếng Việt sẽ mở ra ngay lập tức bên cạnh màn hình làm việc của bạn.

---

## ⚙️ Cài đặt tùy chọn (Settings)

Vào Cài đặt (`Ctrl+,`) $\rightarrow$ tìm `codeforces`:
- `codeforces.saveMarkdownFiles`: Tự động lưu file markdown bài tập vào workspace (mặc định: `true`).
- `codeforces.problemsDirectory`: Thư mục lưu file markdown trong workspace (mặc định: `problems`).
- `codeforces.geminiApiKey`: (Tùy chọn) Nhập Gemini API Key nếu muốn sử dụng AI để dịch văn phong thuật toán nâng cao.
