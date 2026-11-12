# Vũng Tàu Online 🛵🌊

Chạy xe máy dọc **16,3 km** cung đường ven biển đẹp nhất Vũng Tàu: **Trần Phú → Quang Trung → Hạ Long → Thùy Vân** — từ xóm chài Bến Đá ôm quanh Núi Lớn qua Bãi Dâu, Bạch Dinh xuống Bãi Trước, rồi men vách đá Núi Nhỏ qua Hải Đăng, Mũi Nghinh Phong, Tượng Chúa Kitô Vua và mở ra Bãi Sau thẳng tắp.

👉 **Trải nghiệm trực tiếp (GitHub Pages):** [https://lhtruc.github.io/DuLichVungTauOnline/](https://lhtruc.github.io/DuLichVungTauOnline/)

## Điểm nổi bật

- **Bản đồ thực 3D:** Địa hình Núi Lớn & Núi Nhỏ từ lưới độ cao DEM (Terrarium tiles), đường bờ biển, bãi cát, công viên, mạng lưới đường phố và **hơn 46.000 tòa nhà** từ Overture Maps / OpenStreetMap.
- **18 địa danh & Thuyết minh giọng nói (Audio Guide):** Thích Ca Phật Đài, Bến Đá – Sao Mai, Tượng Quan Âm Bãi Dâu, Đức Mẹ Bãi Dâu, Bãi Dâu, Bạch Dinh, Cáp treo Hồ Mây, Công viên Bãi Trước, Bến tàu Cầu Đá, Hải đăng Vũng Tàu, Niết Bàn Tịnh Xá, Bãi Dứa, Mũi Nghinh Phong, Dốc Hoàng Hôn, Tượng Chúa Kitô Vua, Miếu Hòn Bà, Cột cờ Bãi Sau, Công viên Bãi Sau và Tháp Tam Thắng — có nút nghe thuyết minh tiếng Việt trực tiếp và mở Google Street View.
- **Đời sống ven biển sống động:** Phương tiện giao thông AI (xe máy, ô tô chạy hai chiều dọc cung đường), hệ thống đèn đường tự động thắp sáng khi hoàng hôn/ban đêm, tàu thuyền đánh cá dập dềnh ngoài vịnh.
- **Âm thanh Procedural (Web Audio API):** Tiếng động cơ xe tay ga biến thiên theo tốc độ ga, tiếng còi xe đôi, tiếng sóng biển vỗ bờ và gió biển mà không cần tải file âm thanh nặng.
- **Minimap 2D tương tác & Chụp ảnh bưu thiếp:** Bản đồ thu nhỏ góc dưới trái hiển thị vị trí, hướng nhìn và cho phép chạm để dịch chuyển nhanh; nút chụp ảnh lưu ngay bưu thiếp Vũng Tàu kèm tọa độ km.

## Điều khiển

| Phím | Chức năng |
| --- | --- |
| `W` / `S` hoặc `↑` / `↓` | Tăng ga / Phanh |
| `A` / `D` hoặc `←` / `→` | Lách trái / phải |
| `Shift` | Tăng tốc nhanh |
| Kéo chuột / Chạm | Nhìn xung quanh |
| `E` | Tham quan địa danh gần nhất |
| `T` | Bật / tắt chế độ Tự lái |
| `R` | Quay đầu xe |
| `C` | Đổi góc nhìn (Sau xe / Góc nhìn thứ nhất) |
| `F` | Chế độ Flycam bay tự do |
| `N` | Đổi thời gian (Chiều vàng → Hoàng hôn → Đêm → Bình minh → Trưa) |
| `M` | Bật / tắt âm thanh động cơ & sóng biển |
| `H` | Bấm còi xe |
| `P` | Chụp ảnh bưu thiếp (lưu file PNG) |

## Chạy thử tại máy (Local)

```bash
npm install
npm run dev
```

Build bản tĩnh để deploy:

```bash
npm run build
```

Dữ liệu địa hình và tòa nhà đã được đóng gói sẵn trong `public/data/`. Nếu muốn tải và dựng lại từ đầu bằng Python:

```bash
pip install pyarrow shapely scipy pillow numpy
python3 tools/fetch_overture.py && python3 tools/fetch_elevation.py && python3 tools/build_world.py
```

---
Dữ liệu bản đồ © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, [Overture Maps Foundation](https://overturemaps.org/); độ cao từ Mapzen Terrain Tiles (AWS Open Data).
