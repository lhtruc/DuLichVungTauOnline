# Thiết kế: các địa danh ven biển Vũng Tàu

## Ý định

Làm cho các điểm nổi tiếng trên tuyến ven biển dễ nhận ra hơn trong thế giới 3D Three.js hiện có, dùng hình khối và vật liệu dựng tại chỗ. Ảnh tìm trên web chỉ dùng làm tài liệu đối chiếu, không nhúng ảnh có bản quyền vào sản phẩm.

## Phạm vi

- Dựng Tháp Tam Thắng với cụm trụ mosaic xếp cao dần gợi ba mũi thuyền; làm rõ không gian quảng trường/công viên Bãi Sau.
- Dựng công viên Bãi Trước, bờ cảnh quan Bãi Dâu và quần thể tượng Đức Mẹ Bãi Dâu.
- Dựng Miếu Hòn Bà với nhà mái ngói đỏ, tường vàng, cổng và nền đảo đá.
- Bổ sung POI Dốc Hoàng Hôn theo vị trí người dùng xác nhận ở Mũi Nghinh Phong, tách biệt với POI Mũi Nghinh Phong hiện có.
- Giữ hệ thống tọa độ, thuyết minh, điều khiển, chất lượng đồ họa và kiến trúc scene đang có.

## Các cách đã cân nhắc

1. **Mô hình hình khối Three.js theo ảnh tham khảo (đã chọn):** tương thích góc nhìn 3D, thời gian trong ngày và cách scene hiện tại đặt landmark theo tọa độ; độ giống ở mức tương đối, ưu tiên silhouette và màu sắc nhận diện.
2. **Ảnh làm vật liệu:** có thể giống một góc ảnh nhưng dễ lộ phẳng khi chạy quanh landmark, không phù hợp ánh sáng và phối cảnh 3D.

## Cách dựng

Mở rộng `src/world/landmarks.js` bằng các builder chuyên biệt thay cho mô hình chung hoặc `model: null`; cập nhật `src/data/pois.js` để gán builder cho các địa danh và thêm Dốc Hoàng Hôn tại đoạn dốc gần Mũi Nghinh Phong theo xác nhận của người dùng. Các công viên dùng cụm đường dạo, mảng xanh, hàng cây và vật thể ven biển ở quy mô rút gọn; từng công trình dùng hình khối đơn giản, màu và tỷ lệ đặc trưng. Mọi hình học phải giữ chi phí vừa phải để không làm nặng cảnh trên thiết bị di động.

## Giới hạn và tiêu chí đạt

Không tạo bản sao kiến trúc chi tiết cấp khảo sát; hình dạng địa hình, bờ biển và công trình nền vẫn do dữ liệu dự án hiện hữu cung cấp. Mỗi điểm trong danh sách phải có silhouette/màu sắc dễ phân biệt, nằm đúng khu vực của POI; Dốc Hoàng Hôn ở Mũi Nghinh Phong xuất hiện trong danh sách dừng và có thể được tham quan như các POI khác.

## Kiểm chứng

Chạy build hiện có để bắt lỗi tích hợp, sau đó xem cảnh ở các điểm dừng đã thêm/cập nhật và điều chỉnh hình học nếu cần.
