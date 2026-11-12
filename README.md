# Vũng Tàu Online 🛵🌊

Du lịch online Vũng Tàu: chạy xe máy trọn 16,3 km ven biển **Trần Phú → Quang Trung → Hạ Long → Thùy Vân** trong thế giới 3D dựng từ dữ liệu bản đồ thật.

- Địa hình Núi Lớn / Núi Nhỏ từ dữ liệu độ cao thật (Terrarium DEM), bờ biển, bãi cát, ~46.000 toà nhà và mạng đường từ Overture Maps (OpenStreetMap).
- 19 điểm tham quan: Tượng Chúa Kitô Vua, Hải đăng, Bạch Dinh, Đức Mẹ Bãi Dâu, Hòn Bà, Bãi Trước, Bãi Sau…
- Nút **Street View thật** mở Google Street View đúng vị trí và hướng bạn đang đứng.

## Điều khiển
`W/S` hoặc `↑/↓` ga – phanh · `A/D` lách · `Shift` tăng tốc · kéo chuột nhìn quanh · `E` tham quan · `T` tự lái · `R` quay đầu · `C` góc nhìn · `F` flycam · `N` đổi thời gian.

## Chạy
```bash
npm install
npm run dev
```

## Dựng lại dữ liệu bản đồ (tuỳ chọn)
```bash
pip install pyarrow shapely scipy pillow numpy
python3 tools/fetch_overture.py && python3 tools/fetch_elevation.py && python3 tools/build_world.py
```

Dữ liệu: © OpenStreetMap contributors, Overture Maps Foundation; độ cao: Mapzen Terrain Tiles (AWS Open Data).
