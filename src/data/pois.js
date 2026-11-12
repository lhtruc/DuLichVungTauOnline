// Points of interest along the tour, ordered roughly by distance along the route.
// lat/lon are real-world coordinates (OpenStreetMap / Overture Maps).
// `view`: where the showcase camera sits relative to the landmark: [bearing° from north, distance m, height m].
export const POIS = [
  {
    id: 'thichca', name: 'Thích Ca Phật Đài', icon: '☸️', lat: 10.37408, lon: 107.07100, model: 'thichca',
    tag: 'Chùa · Núi Lớn', view: [60, 85, 26],
    text: 'Quần thể Phật giáo nổi tiếng trên sườn bắc Núi Lớn, khánh thành năm 1963. Từ cổng tam quan, lối bậc thang dẫn lên tượng Kim Thân Phật Tổ trắng ngồi thiền trên tòa sen và bảo tháp bát giác cao khoảng 19 m.',
    facts: ['Khánh thành: 1963', 'Bảo tháp bát giác ~19 m', 'Tượng Phật Thích Ca ngồi trên tòa sen'],
  },
  {
    id: 'benda', name: 'Bến Đá – Sao Mai', icon: '⚓', lat: 10.3818, lon: 107.0655, model: 'port',
    tag: 'Làng chài · Cảng cá', view: [200, 120, 40],
    text: 'Mũi phía bắc của Núi Lớn là xóm chài Bến Đá và cảng Sao Mai nhìn ra vịnh Gành Rái. Sáng sớm ghe thuyền về bến, hải sản được đưa thẳng lên chợ Bến Đá. Xa xa là luồng tàu lớn vào cảng Cái Mép – Thị Vải và Sài Gòn.',
    facts: ['Nhà thờ Bến Đá, chợ hải sản', 'Nhìn ra vịnh Gành Rái', 'Nơi con đường Trần Phú ôm trọn Núi Lớn'],
  },
  {
    id: 'quanam', name: 'Tượng Quan Âm Bồ Tát – Bãi Dâu', icon: '🪷', lat: 10.37161, lon: 107.05868, model: 'quanam',
    tag: 'Tượng đài · Biển', view: [250, 60, 14],
    text: 'Tượng Quan Thế Âm Bồ Tát trắng cao khoảng 16 m đứng trên tòa sen sát mép nước, mặt hướng ra biển như che chở cho ngư dân. Phía sau là Phổ Đà Sơn Quan Âm Bồ Tát Tự tựa lưng vào Núi Lớn.',
    facts: ['Tượng cao ~16 m', 'Hướng mặt ra vịnh Gành Rái', 'Điểm ngắm hoàng hôn yên tĩnh'],
  },
  {
    id: 'ducme', name: 'Đức Mẹ Bãi Dâu', icon: '⛪', lat: 10.37005, lon: 107.06144, model: 'ducme',
    tag: 'Hành hương · Núi Lớn', view: [255, 150, 55],
    text: 'Đền thánh Đức Mẹ Bãi Dâu nằm trên sườn Núi Lớn với tượng Đức Mẹ bồng Chúa Hài Đồng trắng muốt cao khoảng 32 m, nhìn xuống bãi Dâu rợp bóng cây. Đường lên tượng có 14 chặng Đàng Thánh Giá.',
    facts: ['Tượng Đức Mẹ cao ~32 m', 'Trung tâm hành hương lớn của giáo phận Bà Rịa', 'Bãi Dâu: bãi tắm kín gió, nước êm'],
  },
  {
    id: 'baidau', name: 'Bãi Dâu', icon: '🏖️', lat: 10.3686, lon: 107.0613, model: null,
    tag: 'Bãi biển', view: [240, 140, 45],
    text: 'Bãi biển nhỏ dài chừng 3 km nép dưới chân Núi Lớn, xưa kia mọc nhiều cây dâu rừng nên thành tên. Nhờ núi chắn gió, biển ở đây lặng sóng quanh năm — lý tưởng để ngắm hoàng hôn.',
    facts: ['Còn gọi là bãi Phương Thảo', 'Kín gió, sóng êm', 'Nhiều quán hải sản ven đường Trần Phú'],
  },
  {
    id: 'bachdinh', name: 'Bạch Dinh', icon: '🏛️', lat: 10.35074, lon: 107.06865, model: 'bachdinh',
    tag: 'Di tích · Kiến trúc Pháp', view: [235, 75, 22],
    text: 'Villa Blanche — dinh thự trắng kiểu Pháp xây từ 1898 đến 1902 cho Toàn quyền Đông Dương Paul Doumer, trên nền pháo đài Phước Thắng cũ. Vua Thành Thái từng bị quản thúc tại đây (1907–1916). Lối lên rợp bóng cây sứ, mùa hoa nở trắng cả sườn đồi.',
    facts: ['Xây dựng: 1898–1902', 'Cao 19 m, 3 tầng', 'Di tích lịch sử – văn hoá quốc gia (1992)'],
  },
  {
    id: 'homay', name: 'Cáp treo Hồ Mây', icon: '🚡', lat: 10.35118, lon: 107.06643, model: 'cablecar',
    tag: 'Khu du lịch · Núi Lớn', view: [215, 170, 60],
    text: 'Từ nhà ga dưới đường Trần Phú, cabin cáp treo vượt khoảng 500 m lên đỉnh Núi Lớn cao hơn 200 m. Trên đỉnh là Hồ Mây Park với vòng quay, tượng Phật Di Lặc và tầm nhìn bao trọn thành phố biển.',
    facts: ['Tuyến cáp dài ~500 m', 'Đỉnh Núi Lớn (núi Tương Kỳ) cao 245 m', 'Tượng Phật Di Lặc cao ~30 m trên đỉnh'],
  },
  {
    id: 'baitruoc', name: 'Bãi Trước', icon: '🌅', lat: 10.3440, lon: 107.0738, model: 'baitruoc',
    tag: 'Bãi biển · Trung tâm', view: [240, 190, 70],
    text: 'Bãi Trước — xưa gọi là bãi Tầm Dương, "tìm mặt trời" — nằm giữa Núi Lớn và Núi Nhỏ như một vầng trăng khuyết. Công viên rợp dừa chạy dọc đường Quang Trung, ngoài vịnh là hàng trăm ghe thuyền neo đậu. Đây là nơi ngắm hoàng hôn đẹp nhất thành phố.',
    facts: ['Tên cũ: Vịnh Hàng Dừa (Baie des Cocotiers)', 'Mặt trời lặn thẳng xuống biển', 'Công viên Bãi Trước & tượng đài'],
  },
  {
    id: 'cauda', name: 'Bến tàu Cầu Đá', icon: '⛴️', lat: 10.33935, lon: 107.07095, model: 'pier',
    tag: 'Bến tàu cao tốc', view: [300, 110, 30],
    text: 'Bến tàu khách nơi tàu cao tốc nối Vũng Tàu với TP.HCM (bến Bạch Đằng), Cần Giờ và Côn Đảo cập bến. Tuyến tàu cánh ngầm huyền thoại từng xuất phát từ đây suốt nhiều thập kỷ.',
    facts: ['Tàu cao tốc đi TP.HCM ~2 giờ', 'Điểm đầu đường Hạ Long', 'Ngay chân Núi Nhỏ'],
  },
  {
    id: 'haidang', name: 'Hải đăng Vũng Tàu', icon: '🗼', lat: 10.33411, lon: 107.07766, model: 'lighthouse',
    tag: 'Di tích · Núi Nhỏ', view: [250, 70, 30],
    text: 'Ngọn hải đăng cổ nhất Việt Nam còn hoạt động: người Pháp dựng năm 1862, đến 1913 dời lên đỉnh Núi Nhỏ cao 170 m. Tháp tròn trắng cao 18 m, đèn chiếu xa khoảng 35 hải lý, dẫn lối cho tàu thuyền vào vịnh Gành Rái.',
    facts: ['Xây dựng: 1862, dời lên đỉnh năm 1913', 'Tháp cao 18 m trên đỉnh 170 m', 'Bốn khẩu thần công cổ bên chân tháp'],
  },
  {
    id: 'nietban', name: 'Niết Bàn Tịnh Xá', icon: '🛕', lat: 10.33062, lon: 107.07680, model: 'nietban',
    tag: 'Chùa Phật Nằm', view: [220, 70, 22],
    text: 'Ngôi chùa tựa lưng Núi Nhỏ, hướng mặt ra biển, xây từ 1969 đến 1974. Trước sân là cột phướn hình hoa sen cao 21 m; trong chánh điện có tượng Phật Thích Ca nhập niết bàn dài 12 m, vì thế dân gian gọi là "Chùa Phật Nằm".',
    facts: ['Xây dựng: 1969–1974', 'Tượng Phật nằm dài 12 m', 'Đại hồng chung nặng 3,5 tấn'],
  },
  {
    id: 'baidua', name: 'Bãi Dứa', icon: '🪨', lat: 10.3276, lon: 107.0801, model: null,
    tag: 'Bãi đá · Hạ Long', view: [205, 120, 40],
    text: 'Đoạn đẹp nhất của đường Hạ Long: một bên vách Núi Nhỏ, một bên ghềnh đá sóng vỗ. Ngày xưa nơi này mọc đầy dứa gai nên gọi là Bãi Dứa. Biển kín gió, nước trong, hợp cho những buổi cà phê nhìn ra biển.',
    facts: ['Còn gọi là Hương Phong Hải Khẩu', 'Ghềnh đá xen bãi cát nhỏ', 'Cung đường ven biển đẹp bậc nhất Việt Nam'],
  },
  {
    id: 'nghinhphong', name: 'Mũi Nghinh Phong', icon: '🌬️', lat: 10.3222, lon: 107.0838, model: 'cape',
    tag: 'Mũi đất · Cực nam', view: [200, 150, 45],
    text: 'Mũi đất vươn dài nhất về phía nam của bán đảo, quanh năm lộng gió — "Nghinh Phong" nghĩa là đón gió. Hai bên mũi là bãi Vọng Nguyệt và bãi Hương Phong; "cổng trời" trên mỏm đá là góc chụp ảnh nổi tiếng.',
    facts: ['Người Pháp gọi là Cap Saint-Jacques', 'Điểm cực nam bán đảo Vũng Tàu', 'Bãi Vọng Nguyệt (Ô Quắn) ngay bên cạnh'],
  },
  {
    id: 'chuakito', name: 'Tượng Chúa Kitô Vua', icon: '✝️', lat: 10.32650, lon: 107.08452, model: 'christ',
    tag: 'Biểu tượng Vũng Tàu', view: [150, 95, 30],
    text: 'Biểu tượng của Vũng Tàu: tượng Chúa Kitô Vua dang tay trên đỉnh Núi Nhỏ, cao 32 m, sải tay 18,4 m — khởi công năm 1974, hoàn thành 1994. Leo hơn 800 bậc đá rồi 133 bậc xoắn trong lòng tượng, bạn sẽ đứng trên vai Chúa nhìn toàn cảnh Bãi Sau.',
    facts: ['Cao 32 m · sải tay 18,4 m', 'Hơn 800 bậc thang lên đỉnh', 'Một trong những tượng Chúa lớn nhất châu Á'],
  },
  {
    id: 'honba', name: 'Hòn Bà', icon: '🏝️', lat: 10.32393, lon: 107.08923, model: 'honba',
    tag: 'Đảo nhỏ · Miếu', view: [320, 150, 40],
    text: 'Hòn đảo nhỏ cách bờ Bãi Sau chừng 200 m, trên đảo có Miếu Hòn Bà xây từ năm 1781. Mỗi tháng đôi lần khi triều rút thấp, một lối đá lộ ra giữa biển để người ta đi bộ ra đảo thắp hương.',
    facts: ['Miếu xây năm 1781', 'Đi bộ ra đảo khi triều rút', 'Người Pháp gọi là "Archinard"'],
  },
  {
    id: 'cotco', name: 'Cột cờ Bãi Sau', icon: '🇻🇳', lat: 10.33429, lon: 107.09021, model: 'flag',
    tag: 'Quảng trường', view: [130, 80, 20],
    text: 'Nơi đường Hạ Long gặp Thùy Vân là quảng trường cột cờ với lá cờ đỏ sao vàng tung bay trước biển. Từ đây Bãi Sau mở ra thẳng tắp về phía đông bắc.',
    facts: ['Điểm đầu đường Thùy Vân', 'Chân núi Tao Phùng (Núi Nhỏ)', 'Gần Đồi Con Heo — điểm ngắm bình minh'],
  },
  {
    id: 'baisau', name: 'Bãi Sau – Thùy Vân', icon: '🏝️', lat: 10.3420, lon: 107.0952, model: 'beach',
    tag: 'Bãi tắm chính', view: [120, 170, 60],
    text: 'Bãi Thùy Vân — Bãi Sau — chạy dài gần 10 km từ chân Núi Nhỏ tới Cửa Lấp, cát mịn thoai thoải, sóng lớn vào mùa gió chướng. Dọc đường Thùy Vân là khách sạn, quán hải sản và công viên biển vừa được chỉnh trang.',
    facts: ['Dài gần 10 km', 'Bình minh mọc thẳng từ biển', 'Mùa gió bắc: thiên đường lướt ván diều'],
  },
  {
    id: 'tamthang', name: 'Tháp Tam Thắng', icon: '🗽', lat: 10.34878, lon: 107.09600, model: 'tamthang',
    tag: 'Quảng trường biển', view: [125, 110, 35],
    text: 'Biểu tượng mới của Bãi Sau: tháp Tam Thắng giữa quảng trường biển, gợi hình cánh buồm và ba làng Thắng Nhất – Thắng Nhì – Thắng Tam, những ngôi làng đầu tiên lập nên Vũng Tàu từ thời vua Gia Long.',
    facts: ['Khánh thành 2023', 'Tam Thắng: ba làng khai sinh Vũng Tàu', 'Công viên Thùy Vân chỉnh trang dài ~3 km'],
  },
  {
    id: 'finish', name: 'Cuối đường Thùy Vân', icon: '🏁', lat: 10.3537, lon: 107.1031, model: 'gate',
    tag: 'Kết thúc hành trình', view: [40, 70, 18],
    text: 'Bạn đã đi trọn hơn 16 km đường ven biển: ôm Núi Lớn theo Trần Phú, qua Bãi Trước, vòng Núi Nhỏ theo Hạ Long rồi chạy hết Thùy Vân. Phía trước là sân golf Paradise và bãi Chí Linh — hẹn gặp lại Vũng Tàu!',
    facts: ['Tổng hành trình: 16,3 km', '4 con đường · 2 ngọn núi · 5 bãi biển', 'Hẹn gặp lại!'],
  },
];
