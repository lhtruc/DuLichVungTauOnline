// Points of interest along the tour (Bãi Sau → Hạ Long → Bãi Trước → Trần Phú).
// lat/lon: OpenStreetMap / Overture Maps. Facts: Vietnamese press (Nhân Dân, VnExpress, Tuổi Trẻ, Dân trí, SGGP), 2025–2026.
// `view`: showcase camera [bearing° from north, distance m, height m]. `model`: builder in world/landmarks.js.
// `clear`: radius (m) in which mapped buildings are removed so the landmark model stands free.
export const POIS = [
  {
    id: 'baisau', name: 'Công viên Bãi Sau (Thùy Vân)', icon: '🌴', lat: 10.3512, lon: 107.0999, model: 'baisau', labelHeight: 14, seafront: 20,
    tag: 'Công viên biển · Điểm xuất phát', view: [120, 150, 45],
    text: 'Công viên biển dọc đường Thùy Vân vừa được chỉnh trang và khánh thành ngày 19/12/2025: lối dạo bộ, bãi cỏ, hàng dừa và quảng trường trải dài theo Bãi Sau. Hành trình của bạn bắt đầu từ đây, chạy về phía Núi Nhỏ.',
    facts: ['Dài khoảng 3,2 km, rộng hơn 19,2 ha', 'Vốn gần 1.100 tỷ đồng, khởi công 28/10/2024', 'Khánh thành 19/12/2025'],
  },
  {
    id: 'tamthang', name: 'Quảng trường & Tháp Tam Thắng', icon: '🗼', lat: 10.34585, lon: 107.0967, model: 'tamthang', clear: 75, seafront: 42,
    tag: 'Biểu tượng mới Bãi Sau', view: [295, 120, 55],
    text: 'Tháp Tam Thắng gồm 143 trụ bê tông tiết diện đa giác ốp gốm mosaic, cao dần từ 4,55 m lên 34,25 m về phía biển. Các trụ xếp thành khối tháp nhọn, gợi hình ba mũi thuyền vươn khơi và ba làng Thắng Nhất, Thắng Nhì, Thắng Tam. Phía trước là sân khấu và quảng trường lát caro gắn đèn; về đêm tháp rực ánh LED hồng tím.',
    facts: ['143 trụ, cao 4,55 – 34,25 m', 'Quảng trường hơn 17.000 m², sân khấu nhạc nước', 'Thiết kế: KTS Oliviero Godi (Ý), thi công 75 ngày'],
  },
  {
    id: 'caong', name: 'Công viên Cá Ông (Cột Cờ cũ)', icon: '🐋', lat: 10.3344, lon: 107.0904, model: 'caong', clear: 32,
    tag: 'Quảng trường Cột Cờ', view: [100, 36, 9],
    text: 'Tại quảng trường Cột Cờ cũ ở đầu đường Thùy Vân, tượng cá Ông (cá voi lưng gù) đúc đồng đỏ, phủ màu xanh đồng, cao 8,8 m vươn lên từ những con sóng cuộn giữa hồ nước tròn có vòng vòi phun. Cá Ông (cá voi) là vị thần hộ mệnh của ngư dân miền biển; công trình mở cửa ngày 3/2/2026.',
    facts: ['Tượng đồng đỏ cao 8,8 m, nặng khoảng 40–50 tấn', 'Quảng trường 2.573 m², hồ nước và nhạc nước', 'Kinh phí hơn 50 tỷ đồng'],
  },
  {
    id: 'honba', name: 'Hòn Bà & Miếu Hòn Bà', icon: '🏝️', lat: 10.32393, lon: 107.08923, model: 'honba', clear: 45,
    tag: 'Đảo nhỏ · Miếu cổ', view: [320, 140, 35],
    text: 'Hòn đảo nhỏ cách bờ Bãi Sau khoảng 200 m. Miếu Hòn Bà xây năm 1781, trùng tu năm 1971: cổng hai trụ đỡ mái ngói, trên nóc có "lưỡng long chầu nhật". Khi triều rút thấp, con đường đá phủ đầy hàu lộ ra để đi bộ ra đảo.',
    facts: ['Cách bờ ~200 m, đi bộ ~30 phút khi nước ròng', 'Miếu xây 1781, trùng tu 1971', 'Lễ hội rằm tháng Giêng, 4, 7, 10 âm lịch'],
  },
  {
    // location confirmed by the user (commit 89e414a)
    id: 'docnghinhphong', name: 'Dốc Hoàng Hôn – Mũi Nghinh Phong', icon: '🌇', lat: 10.32295, lon: 107.0833, model: 'hoanghon', labelHeight: 9,
    tag: 'Đường dốc · Điểm ngắm biển', view: [270, 55, 15],
    text: 'Đoạn dốc ven biển gần lối lên Mũi Nghinh Phong: tới chân núi Tao Phùng, con dốc nhỏ men theo sườn Núi Nhỏ mở ra tầm nhìn rộng về phía biển và ánh chiều. Dừng xe ở điểm ngắm cảnh để nhìn lại cung đường và bờ biển quanh mũi.',
    facts: ['Gần lối lên Mũi Nghinh Phong', 'Đường dốc ven sườn núi, hướng nhìn ra biển', 'Có thể ghé cùng điểm Cổng Trời'],
  },
  {
    id: 'nghinhphong', name: 'Mũi Nghinh Phong · Cổng Trời', icon: '🌬️', lat: 10.3222, lon: 107.0838, model: 'nghinhphong', clear: 60,
    tag: 'Mũi đất · Cực nam', view: [200, 120, 40],
    text: 'Mũi đất vươn dài nhất về phía nam của bán đảo, quanh năm lộng gió — "Nghinh Phong" là đón gió. Điểm check-in nổi tiếng là "Cổng Trời" trên mỏm đá; từ trên cao nhìn thấy cả bãi Vọng Nguyệt và bãi Hương Phong hai bên.',
    facts: ['Người Pháp gọi là Cap Saint-Jacques', 'Cổng Trời: góc chụp ảnh nổi tiếng', 'Nên đến sáng sớm hoặc chiều mát'],
  },
  {
    id: 'chuakito', name: 'Tượng Chúa Kitô Vua', icon: '✝️', lat: 10.32650, lon: 107.08452, model: 'christ', clear: 20,
    tag: 'Đỉnh Núi Nhỏ', view: [150, 95, 30],
    text: 'Tượng Chúa Kitô Vua dang tay trên đỉnh Núi Nhỏ, cao 32 m, sải tay 18,4 m, khởi công 1974, hoàn thành 1994. Hơn 800 bậc đá dẫn lên chân tượng.',
    facts: ['Cao 32 m · sải tay 18,4 m', 'Hơn 800 bậc thang', 'Hoàn thành năm 1994'],
  },
  {
    id: 'soho', name: 'Soho Coffee (Bãi Dứa)', icon: '☕', lat: 10.33042, lon: 107.07634, model: 'soho', clear: 18,
    tag: 'Cà phê view biển · 66 Hạ Long', view: [230, 45, 12],
    text: 'Quán cà phê trắng nổi tiếng ở số 66 đường Hạ Long, khu Bãi Dứa: chỉ cần băng qua đường là ra biển. Không gian nhiều góc chụp ảnh, nhìn thẳng ra vịnh.',
    facts: ['66 Hạ Long (Bãi Dứa)', 'Mở cửa khoảng 6:00 – 22:00', 'Đối diện ghềnh đá Bãi Dứa'],
  },
  {
    id: 'haidang', name: 'Hải đăng Vũng Tàu', icon: '🗼', lat: 10.33411, lon: 107.07766, model: 'lighthouse',
    tag: 'Đỉnh Núi Nhỏ', view: [250, 70, 30],
    text: 'Ngọn hải đăng người Pháp dựng năm 1862, đến 1913 dời lên đỉnh Núi Nhỏ. Tháp tròn trắng cao 18 m, chiếu xa khoảng 35 hải lý.',
    facts: ['Xây 1862, dời lên đỉnh 1913', 'Tháp cao 18 m', 'Chiếu xa ~35 hải lý'],
  },
  {
    id: 'cauda', name: 'Bến tàu Cầu Đá', icon: '⛴️', lat: 10.33935, lon: 107.07095, model: null,
    tag: 'Bến tàu cao tốc', view: [300, 110, 30],
    text: 'Bến tàu cao tốc nối Vũng Tàu với TP.HCM, Cần Giờ và Côn Đảo, ngay chân Núi Nhỏ, nơi đường Hạ Long gặp Quang Trung.',
    facts: ['Tàu cao tốc đi TP.HCM ~2 giờ', 'Đầu đường Hạ Long', 'Chân Núi Nhỏ'],
  },
  {
    id: 'baitruoc', name: 'Bãi Trước & Công viên Bãi Trước', icon: '🌅', lat: 10.34385, lon: 107.07425, model: 'baitruoc', labelHeight: 14, seafront: 16,
    tag: 'Bãi biển · Công viên', view: [240, 190, 70],
    text: 'Bãi Trước — xưa là vịnh Hàng Dừa — cong như vầng trăng khuyết giữa Núi Lớn và Núi Nhỏ. Công viên trải theo vòng cung bờ biển dọc đường Quang Trung với hàng dừa cổ thụ và cây bàng lâu năm; ngoài vịnh ghe thuyền neo đậu. Nơi ngắm hoàng hôn đẹp nhất thành phố.',
    facts: ['Tên cũ: Vịnh Hàng Dừa', 'Dừa cổ thụ, cây bàng lâu năm', 'Mặt trời lặn thẳng xuống biển'],
  },
  {
    id: 'bachdinh', name: 'Bạch Dinh', icon: '🏛️', lat: 10.35074, lon: 107.06865, model: null,
    tag: 'Di tích · Kiến trúc Pháp', view: [235, 75, 22],
    text: 'Villa Blanche xây 1898–1902 cho Toàn quyền Paul Doumer. Vua Thành Thái từng bị giam lỏng tại đây (1907–1916).',
    facts: ['Xây 1898–1902', 'Di tích quốc gia (1992)'],
  },
  {
    id: 'homay', name: 'Cáp treo Hồ Mây', icon: '🚡', lat: 10.35118, lon: 107.06643, model: null,
    tag: 'Khu du lịch Núi Lớn', view: [215, 170, 60],
    text: 'Nhà ga cáp treo dưới đường Trần Phú đưa khách lên khu du lịch Hồ Mây trên Núi Lớn.',
    facts: ['Núi Lớn (núi Tương Kỳ) cao 245 m'],
  },
  {
    id: 'ganhhao', name: 'Nhà hàng Gành Hào', icon: '🦐', lat: 10.35979, lon: 107.06031, model: 'ganhhao', clear: 22,
    tag: 'Hải sản · Trần Phú', view: [250, 60, 18],
    text: 'Nhà hàng hải sản nổi tiếng bên đường Trần Phú, các dãy bàn nhìn thẳng ra biển, buổi tối đèn hắt xuống mặt nước. Cơ sở chính ghi địa chỉ 03 Trần Phú, cơ sở 2 ở 09 Hạ Long.',
    facts: ['Hải sản tươi sống', 'View biển phía tây Núi Lớn', 'Ngắm hoàng hôn khi ăn tối'],
  },
  {
    id: 'baidau', name: 'Bãi Dâu', icon: '🏖️', lat: 10.3686, lon: 107.0613, model: 'baidau', labelHeight: 10,
    tag: 'Bãi biển · Chân Núi Lớn', view: [240, 140, 45],
    text: 'Bãi biển nhỏ nép dưới chân Núi Lớn, xưa mọc nhiều cây dâu rừng nên thành tên. Núi chắn gió nên biển lặng quanh năm, nhiều quán hải sản ven đường Trần Phú.',
    facts: ['Kín gió, sóng êm', 'Ngắm hoàng hôn', 'Ngay dưới Đền thánh Đức Mẹ'],
  },
  {
    id: 'ducme', name: 'Tượng Đức Mẹ Bãi Dâu', icon: '⛪', lat: 10.37005, lon: 107.06144, model: 'ducme', clear: 22,
    tag: 'Đền thánh · 140A Trần Phú', view: [255, 120, 45],
    text: 'Tượng Đức Mẹ bằng đá trắng cao 32 m trên sườn Núi Lớn, bế và nâng cao Chúa Hài Đồng hướng về phía biển. Lối lên đền có 14 chặng Đàng Thánh Giá.',
    facts: ['Cao 32 m, đá trắng, nặng gần 500 tấn', 'Đức Mẹ nâng Chúa Hài Đồng hướng ra biển', '140A Trần Phú'],
  },
  {
    id: 'quanam', name: 'Tượng Quan Âm (Bãi Dâu)', icon: '🪷', lat: 10.37161, lon: 107.05868, model: 'quanam',
    tag: 'Tượng đài · Biển', view: [250, 60, 14],
    text: 'Tượng Quan Thế Âm Bồ Tát trắng đứng trên tòa sen sát mép nước, mặt hướng ra biển. Phía sau là Phổ Đà Sơn Quan Âm Bồ Tát Tự.',
    facts: ['Hướng ra vịnh Gành Rái'],
  },
  {
    id: 'thichca', name: 'Thích Ca Phật Đài', icon: '☸️', lat: 10.37408, lon: 107.07100, model: 'thichca',
    tag: 'Chùa · Núi Lớn', view: [60, 85, 26],
    text: 'Quần thể Phật giáo trên sườn bắc Núi Lớn, khánh thành năm 1963.',
    facts: ['Khánh thành 1963'],
  },
  {
    id: 'benda', name: 'Bến Đá – Sao Mai', icon: '🏁', lat: 10.3818, lon: 107.0655, model: null,
    tag: 'Cuối hành trình', view: [200, 120, 40],
    text: 'Xóm chài Bến Đá ở mũi bắc Núi Lớn, nhìn ra vịnh Gành Rái — điểm cuối đường Trần Phú. Bạn đã đi trọn 16,3 km ven biển từ Bãi Sau!',
    facts: ['Tổng hành trình 16,3 km', '4 con đường · 2 ngọn núi · nhiều bãi biển'],
  },
];
