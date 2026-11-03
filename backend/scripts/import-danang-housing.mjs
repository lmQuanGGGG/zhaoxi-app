import postgres from "postgres";

// ZhaoXi Homes Đà Nẵng: the housing storefront behind the "Thuê nhà Đà Nẵng" service.
// Prices follow the 2026 Đà Nẵng rental market (studio ~7–9M, 1BR ~9–13M,
// 2BR ~10–20M VND/month, beachside villas with pool from ~35M). Photos are
// illustrative, free-licensed Unsplash images (credited in metadata.photoSources);
// ZhaoXi confirms the exact unit, address and price when a customer inquires.
// Idempotent: organization and listings are upserted by code.

const databaseUrl = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("POSTGRES_URL or DATABASE_URL is required.");

const sql = postgres(databaseUrl, { prepare: false, max: 1 });

const photo = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&q=80`;
const unsplashPage = (slug) => `https://unsplash.com/photos/${slug}`;

const ORG = {
  code: "ZX-HOME-DN",
  type: "real-estate",
  name: "ZhaoXi Homes Đà Nẵng",
  description:
    "Cho thuê căn hộ, nhà nguyên căn và biệt thự tại Đà Nẵng cho khách Trung Quốc và người nước ngoài. ZhaoXi hỗ trợ xem nhà, hợp đồng song ngữ và đăng ký tạm trú.",
  addressText: "An Thượng, Ngũ Hành Sơn, Đà Nẵng",
  metadata: {
    latitude: 16.0503,
    longitude: 108.2456,
    verified: false,
    bannerUrls: [photo("1655265173507-a23472e90225")],
    photoCredit: "Unsplash",
  },
};

const note = {
  "vi-VN": "Ảnh minh họa. Giá tham khảo theo thị trường; ZhaoXi xác nhận căn trống, địa chỉ chính xác và hợp đồng khi bạn gửi yêu cầu.",
  "en-US": "Illustrative photos. Indicative market price; ZhaoXi confirms availability, the exact address and the contract when you send an inquiry.",
  "zh-CN": "图片仅供参考。价格为市场参考价；提交租房意向后，ZhaoXi 会确认房源、具体地址及合同。",
  "zh-TW": "圖片僅供參考。價格為市場參考價；提交租房意向後，ZhaoXi 會確認房源、具體地址及合約。",
};

const listings = [
  {
    code: "ZX-HOUSE-DN-01",
    price: 7500000,
    meta: {
      propertyType: "Studio", bedrooms: 1, bathrooms: 1, areaSqm: 30, district: "Ngũ Hành Sơn",
      propertyAddress: "Khu phố An Thượng, Ngũ Hành Sơn, Đà Nẵng", furnished: "yes",
      depositMonths: 1, minLeaseMonths: 3, latitude: 16.0509, longitude: 108.2449,
      amenities: ["Máy lạnh", "Wi-Fi", "Máy giặt", "Bếp riêng", "Dọn phòng hằng tuần", "Biển Mỹ Khê 5 phút đi bộ"],
    },
    photos: [
      ["1702014857653-dcea938d51f0", "a-room-with-a-bed-and-a-table-with-a-bowl-on-it-dEuvqNbwRuw"],
      ["1702014862053-946a122b920d", "a-kitchen-with-a-table-and-chairs-in-it-NoPzk4m4jHc"],
      ["1702014859908-d48b9b844240", "a-room-with-a-table-chairs-and-a-television-hrY-pZqFGyI"],
      ["1772476361208-27d580dd3328", "modern-kitchen-with-sink-stove-and-washing-machine-kyfvku_y1T0"],
    ],
    t: {
      "vi-VN": ["Studio An Thượng gần biển Mỹ Khê", "Studio 30m² đủ nội thất giữa phố Tây An Thượng, 5 phút đi bộ ra biển.", "Studio sáng, có bếp riêng và máy giặt, khu An Thượng nhiều quán ăn, cà phê, siêu thị mini. Phù hợp 1–2 người ở dài hạn hoặc công tác."],
      "en-US": ["An Thuong studio near My Khe Beach", "Fully furnished 30m² studio in the An Thuong expat quarter, a 5-minute walk to the beach.", "Bright studio with its own kitchen and washing machine, in An Thuong with plenty of restaurants, cafés and mini-marts. Suits 1–2 people for long stays or work trips."],
      "zh-CN": ["安上区近美溪海滩开间公寓", "30㎡ 全家具开间，位于安上外国人社区，步行 5 分钟到海滩。", "采光好，独立厨房和洗衣机。安上区餐厅、咖啡馆、便利店众多，适合 1–2 人长住或出差。"],
      "zh-TW": ["安上區近美溪海灘套房", "30㎡ 全家具套房，位於安上外國人社區，步行 5 分鐘到海灘。", "採光好，獨立廚房和洗衣機。安上區餐廳、咖啡館、便利商店眾多，適合 1–2 人長住或出差。"],
    },
  },
  {
    code: "ZX-HOUSE-DN-02",
    price: 9500000,
    meta: {
      propertyType: "Apartment", bedrooms: 1, bathrooms: 1, areaSqm: 50, district: "Sơn Trà",
      propertyAddress: "Khu Phước Mỹ, Sơn Trà, Đà Nẵng", furnished: "yes",
      depositMonths: 1, minLeaseMonths: 6, latitude: 16.0695, longitude: 108.2418,
      amenities: ["Máy lạnh", "Wi-Fi", "Ban công", "Thang máy", "Bảo vệ 24/7", "Chỗ để xe máy"],
    },
    photos: [
      ["1655265173214-77882268bc64", "a-room-with-a-large-window-nzKXWaLN1dQ"],
      ["1655265173336-c7c60814f098", "a-bedroom-with-a-large-window-dTcnrgkzyU8"],
      ["1655265173507-a23472e90225", "a-view-of-a-city-from-a-balcony-rhevY9cOvJI"],
      ["1655265173703-84c855c4d870", "a-dining-room-with-a-large-window-WmgRVnXCfhw"],
      ["1655265172780-b03c3d4ac222", "a-kitchen-with-a-blue-cabinet-KY8tCWpVcpY"],
    ],
    t: {
      "vi-VN": ["Căn hộ 1 phòng ngủ view thành phố Sơn Trà", "Căn hộ 50m² cửa kính lớn nhìn ra thành phố, cách biển Phạm Văn Đồng 600m.", "Phòng ngủ và phòng khách thông thoáng, ban công rộng, tòa nhà có thang máy và bảo vệ. Gần cầu Rồng, chợ và nhiều nhà hàng hải sản."],
      "en-US": ["1-bedroom city-view apartment in Son Tra", "50m² apartment with floor-to-ceiling windows, 600m from Pham Van Dong beach.", "Airy bedroom and living room with a wide balcony, in a building with a lift and security. Close to the Dragon Bridge, local market and seafood restaurants."],
      "zh-CN": ["山茶区一室城景公寓", "50㎡ 落地窗公寓，城市景观，距范文同海滩 600 米。", "卧室与客厅通透，大阳台，楼内有电梯和保安。靠近龙桥、市场和多家海鲜餐厅。"],
      "zh-TW": ["山茶區一房城景公寓", "50㎡ 落地窗公寓，城市景觀，距范文同海灘 600 公尺。", "臥室與客廳通透，大陽台，樓內有電梯和保全。靠近龍橋、市場和多家海鮮餐廳。"],
    },
  },
  {
    code: "ZX-HOUSE-DN-03",
    price: 12000000,
    meta: {
      propertyType: "Apartment", bedrooms: 1, bathrooms: 1, areaSqm: 55, district: "Hải Châu",
      propertyAddress: "Gần đường Bạch Đằng, ven sông Hàn, Hải Châu, Đà Nẵng", furnished: "yes",
      depositMonths: 2, minLeaseMonths: 6, latitude: 16.0678, longitude: 108.2236,
      amenities: ["Máy lạnh", "Wi-Fi", "Khóa vân tay", "Máy lọc không khí", "Bếp đầy đủ", "Gym & hồ bơi tòa nhà"],
    },
    photos: [
      ["1737737149038-e6532662659e", "a-living-room-and-kitchen-with-a-flat-screen-tv-LFwKmcz1X3A"],
      ["1737737164423-898dbd3d7064", "a-kitchen-with-a-wooden-table-and-white-cabinets-97RTgbNXYTg"],
      ["1737737196308-e5b848160b78", "a-living-room-filled-with-furniture-and-a-blue-couch-bDIpPnj8j34"],
      ["1737737180662-b3664e1741fd", "a-kitchen-with-a-white-counter-top-and-white-cabinets-jDCcwOkS6YA"],
      ["1737737192166-e0e2fa311fd7", "a-kitchen-with-a-refrigerator-and-a-sink-JtWLwfqA09w"],
    ],
    t: {
      "vi-VN": ["Căn hộ cao cấp 1 phòng ngủ ven sông Hàn", "Căn hộ 55m² thiết kế hiện đại tại trung tâm Hải Châu, đi bộ ra sông Hàn.", "Nội thất mới, khóa vân tay, máy lọc không khí, bếp đầy đủ dụng cụ. Tòa nhà có gym và hồ bơi. Gần trung tâm hành chính, ngân hàng, trung tâm thương mại."],
      "en-US": ["Premium 1-bedroom by the Han River", "Modern 55m² apartment in central Hai Chau, walking distance to the Han River.", "New furniture, fingerprint lock, air purifier and a fully equipped kitchen. Building gym and pool. Close to banks, offices and shopping malls."],
      "zh-CN": ["瀚江边高端一室公寓", "海州市中心 55㎡ 现代公寓，步行可到瀚江。", "全新家具、指纹锁、空气净化器、厨具齐全。楼内有健身房和泳池，靠近银行、写字楼和商场。"],
      "zh-TW": ["瀚江邊高級一房公寓", "海州市中心 55㎡ 現代公寓，步行可到瀚江。", "全新家具、指紋鎖、空氣清淨機、廚具齊全。樓內有健身房和泳池，靠近銀行、辦公大樓和商場。"],
    },
  },
  {
    code: "ZX-HOUSE-DN-04",
    price: 18000000,
    meta: {
      propertyType: "Apartment", bedrooms: 2, bathrooms: 2, areaSqm: 85, district: "Sơn Trà",
      propertyAddress: "Mặt biển Võ Nguyên Giáp, Sơn Trà, Đà Nẵng", furnished: "yes",
      depositMonths: 2, minLeaseMonths: 6, latitude: 16.0752, longitude: 108.2465,
      amenities: ["View biển trực diện", "Máy lạnh", "Wi-Fi", "Hồ bơi", "Gym", "Bảo vệ 24/7", "Chỗ đậu ô tô"],
    },
    photos: [
      ["1777017246552-8b0e36b92d52", "YR9CSC9K9Wc"],
      ["1648775933902-f633de370964", "a-living-room-with-a-couch-a-chair-and-a-table-7ptbiEPxKMQ"],
      ["1777704621924-7557fc44e3c3", "5nSP8OFzckg"],
      ["1633505765486-e404bbbec654", "a-bedroom-with-a-large-bed-in-a-room-IARlbQa6Kc8"],
      ["1774002441737-de08d3639191", "A3XTtDamxS4"],
    ],
    t: {
      "vi-VN": ["Căn hộ 2 phòng ngủ view biển Mỹ Khê", "Căn hộ 85m² nhìn thẳng ra biển trên trục Võ Nguyên Giáp, 2 phòng ngủ 2 WC.", "Phòng khách và phòng ngủ chính hướng biển, nội thất cao cấp. Tòa nhà có hồ bơi, gym, bảo vệ 24/7 và chỗ đậu ô tô. Phù hợp gia đình hoặc 2–4 người."],
      "en-US": ["2-bedroom sea-view apartment on My Khe Beach", "85m² apartment facing the sea on Vo Nguyen Giap, 2 bedrooms and 2 bathrooms.", "Living room and master bedroom face the ocean, premium furniture. Pool, gym, 24/7 security and car parking. Ideal for a family or 2–4 people."],
      "zh-CN": ["美溪海滩两室海景公寓", "武元甲海滨大道 85㎡ 正面海景，两室两卫。", "客厅和主卧朝海，高档家具。楼内有泳池、健身房、24 小时保安和汽车停车位，适合家庭或 2–4 人。"],
      "zh-TW": ["美溪海灘兩房海景公寓", "武元甲海濱大道 85㎡ 正面海景，兩房兩衛。", "客廳和主臥朝海，高級家具。樓內有泳池、健身房、24 小時保全和汽車停車位，適合家庭或 2–4 人。"],
    },
  },
  {
    code: "ZX-HOUSE-DN-05",
    price: 10000000,
    meta: {
      propertyType: "Apartment", bedrooms: 2, bathrooms: 2, areaSqm: 75, district: "Hòa Xuân",
      propertyAddress: "Khu đô thị Hòa Xuân, Cẩm Lệ, Đà Nẵng", furnished: "partial",
      depositMonths: 1, minLeaseMonths: 12, latitude: 16.0012, longitude: 108.2228,
      amenities: ["Máy lạnh", "Wi-Fi", "Khu yên tĩnh", "Gần trường học", "Công viên ven sông", "Chỗ đậu ô tô"],
    },
    photos: [
      ["1662454419736-de132ff75638", "a-living-room-with-a-couch-and-a-table-7Kk8ONcAXqk"],
      ["1791138961286-a9f5845171e4", "modern-bedroom-with-blue-canopy-bed-MU9SEUFSeVc"],
      ["1737305473724-896a66064a68", "a-living-room-with-a-couch-and-a-table-T5Cur7qTg5U"],
      ["1751945964402-a6cfc0ca9200", "elegant-dining-room-with-table-and-chairs-5PVKb56w4LY"],
      ["1638454668466-e8dbd5462f20", "a-bedroom-with-a-bed-desk-and-a-window-WDUtNbot6Qw"],
    ],
    t: {
      "vi-VN": ["Căn hộ 2 phòng ngủ cho gia đình ở Hòa Xuân", "Căn hộ 75m² khu đô thị mới Hòa Xuân, yên tĩnh, gần trường học và công viên ven sông.", "Có sẵn máy lạnh, giường, tủ và sofa; khách có thể bổ sung đồ theo ý. Khu dân cư mới, đường rộng, cách trung tâm khoảng 15 phút đi xe. Ưu tiên thuê từ 12 tháng."],
      "en-US": ["Family 2-bedroom apartment in Hoa Xuan", "75m² apartment in the new Hoa Xuan district, quiet, near schools and a riverside park.", "Comes with air conditioning, beds, wardrobes and a sofa; add your own touches. New residential area with wide roads, about 15 minutes' drive to the centre. 12-month lease preferred."],
      "zh-CN": ["和春区家庭两室公寓", "和春新城区 75㎡ 公寓，安静，靠近学校和河滨公园。", "已配空调、床、衣柜和沙发，可按需添置。新住宅区道路宽敞，车程约 15 分钟到市中心，优先 12 个月起租。"],
      "zh-TW": ["和春區家庭兩房公寓", "和春新市區 75㎡ 公寓，安靜，靠近學校和河濱公園。", "已配冷氣、床、衣櫃和沙發，可依需求添置。新住宅區道路寬敞，車程約 15 分鐘到市中心，優先 12 個月起租。"],
    },
  },
  {
    code: "ZX-HOUSE-DN-06",
    price: 16000000,
    meta: {
      propertyType: "House", bedrooms: 3, bathrooms: 3, areaSqm: 120, district: "Ngũ Hành Sơn",
      propertyAddress: "Khu Mỹ An, Ngũ Hành Sơn, Đà Nẵng", furnished: "yes",
      depositMonths: 2, minLeaseMonths: 12, latitude: 16.0462, longitude: 108.2421,
      amenities: ["Nhà 3 tầng", "Sân thượng", "Máy lạnh mọi phòng", "Wi-Fi", "Bếp rộng", "Chỗ để xe máy", "Biển 10 phút đi bộ"],
    },
    photos: [
      ["1787059671563-ef53c92ba0e7", "residential-homes-along-street-in-vietnam-rUSCRAG7eY4"],
      ["1771830916707-afb2865ecd4e", "balcony-with-table-chairs-and-potted-plants-UyBDVp5IV-g"],
      ["1560185893-a55cbc8c57e8", "hCU4fimRW-c"],
      ["1771830916741-7d02023d5576", "a-small-table-and-chairs-on-a-balcony-ki60vTBX4dc"],
      ["1615529162924-f8605388461d", "ffFnddUEaL4"],
    ],
    t: {
      "vi-VN": ["Nhà nguyên căn 3 tầng 3 phòng ngủ Mỹ An", "Nhà phố 3 tầng, 120m² sàn, 3 phòng ngủ 3 WC, trong kiệt ô tô khu Mỹ An.", "Mỗi phòng ngủ có WC và máy lạnh riêng, bếp rộng, sân thượng phơi đồ và ngồi chơi. Khu dân cư yên tĩnh, đi bộ 10 phút ra biển Mỹ Khê. Phù hợp gia đình hoặc nhóm làm việc."],
      "en-US": ["3-storey, 3-bedroom house in My An", "Whole 3-storey townhouse, 120m² floor area, 3 bedrooms and 3 bathrooms, on a car-accessible lane in My An.", "Every bedroom has its own bathroom and air conditioning, plus a large kitchen and a rooftop terrace. Quiet neighbourhood, 10 minutes' walk to My Khe Beach. Suits a family or a small team."],
      "zh-CN": ["美安区三层三室整栋住宅", "整栋三层街屋，建筑面积 120㎡，三室三卫，位于美安区可通汽车的巷内。", "每间卧室配独立卫浴和空调，大厨房、屋顶露台。社区安静，步行 10 分钟到美溪海滩，适合家庭或小团队。"],
      "zh-TW": ["美安區三層三房整棟住宅", "整棟三層街屋，建築面積 120㎡，三房三衛，位於美安區可通汽車的巷內。", "每間臥室配獨立衛浴和冷氣，大廚房、屋頂露台。社區安靜，步行 10 分鐘到美溪海灘，適合家庭或小團隊。"],
    },
  },
  {
    code: "ZX-HOUSE-DN-07",
    price: 45000000,
    meta: {
      propertyType: "Villa", bedrooms: 4, bathrooms: 5, areaSqm: 280, district: "Ngũ Hành Sơn",
      propertyAddress: "Khu biệt thự ven biển Non Nước, Ngũ Hành Sơn, Đà Nẵng", furnished: "yes",
      depositMonths: 2, minLeaseMonths: 3, latitude: 16.0004, longitude: 108.2651,
      amenities: ["Hồ bơi riêng", "Sân vườn", "BBQ", "Máy lạnh mọi phòng", "Wi-Fi", "Dọn dẹp hằng tuần", "Chỗ đậu ô tô", "Gần biển Non Nước"],
    },
    photos: [
      ["1594479125841-ff7800c6afcc", "0bESYmQLn5M"],
      ["1711322310704-eb2f3511d456", "l99fNLm24Jk"],
      ["1765862835193-3c37388a409e", "KXy7hKJ3EMc"],
      ["1718942901281-1d2984221696", "blyeTlByiso"],
      ["1757524808357-01d16abdb1b1", "bZZ-YKRvRF0"],
      ["1767319499485-91227d0bdf61", "f9BCbXMfjuQ"],
    ],
    t: {
      "vi-VN": ["Biệt thự 4 phòng ngủ hồ bơi riêng gần biển Non Nước", "Biệt thự 280m², 4 phòng ngủ, hồ bơi riêng và sân vườn, cách biển Non Nước vài phút.", "Không gian riêng tư cho gia đình hoặc nhóm bạn: hồ bơi, khu BBQ, phòng khách lớn, 4 phòng ngủ đều có WC. Dọn dẹp hằng tuần. Gần Ngũ Hành Sơn và Hội An (30 phút)."],
      "en-US": ["4-bedroom private-pool villa near Non Nuoc Beach", "280m² villa with 4 bedrooms, a private pool and garden, minutes from Non Nuoc Beach.", "A private retreat for families or groups: pool, BBQ area, large living room and 4 en-suite bedrooms. Weekly housekeeping. Close to the Marble Mountains and 30 minutes to Hoi An."],
      "zh-CN": ["五行山近海四室私人泳池别墅", "280㎡ 别墅，四室，私人泳池和花园，距 Non Nước 海滩几分钟。", "适合家庭或朋友聚居：泳池、烧烤区、大客厅，四间卧室均带卫浴，每周保洁。靠近五行山，30 分钟到会安。"],
      "zh-TW": ["五行山近海四房私人泳池別墅", "280㎡ 別墅，四房，私人泳池和花園，距 Non Nước 海灘幾分鐘。", "適合家庭或朋友同住：泳池、烤肉區、大客廳，四間臥室皆有衛浴，每週打掃。靠近五行山，30 分鐘到會安。"],
    },
  },
  {
    code: "ZX-HOUSE-DN-08",
    price: 8500000,
    meta: {
      propertyType: "Studio", bedrooms: 1, bathrooms: 1, areaSqm: 35, district: "Sơn Trà",
      propertyAddress: "Khu Mân Thái, Sơn Trà, Đà Nẵng", furnished: "yes",
      depositMonths: 1, minLeaseMonths: 3, latitude: 16.0829, longitude: 108.2468,
      amenities: ["View biển", "Máy lạnh", "Wi-Fi", "Bàn làm việc", "Dọn phòng hằng tuần", "Gần chợ hải sản Mân Thái"],
    },
    photos: [
      ["1779870458288-95fd59cd2c5b", "uXYHodDhiG4"],
      ["1770330180310-a8343fd3e3f9", "od0xoHkQN3I"],
      ["1785232244548-5cfe6fb60418", "modern-living-space-with-blue-chair-and-wall-mounted-tv-wrmg3RP_OyA"],
      ["1644589381769-0f5374a52720", "AghsPJvCzc4"],
    ],
    t: {
      "vi-VN": ["Studio view biển Mân Thái", "Studio 35m² nhìn ra biển, khu làng chài Mân Thái, yên tĩnh và gần bán đảo Sơn Trà.", "Phòng sáng, cửa sổ lớn nhìn biển, có bàn làm việc cho người làm việc từ xa. Đi bộ ra biển và chợ hải sản Mân Thái, 10 phút đi xe lên bán đảo Sơn Trà."],
      "en-US": ["Sea-view studio in Man Thai", "35m² studio overlooking the sea in the quiet Man Thai fishing village, near the Son Tra peninsula.", "Bright room with a big sea-facing window and a desk for remote work. Walk to the beach and the Man Thai seafood market; 10 minutes' ride to the Son Tra peninsula."],
      "zh-CN": ["万泰海景开间", "35㎡ 海景开间，位于安静的万泰渔村，靠近山茶半岛。", "采光好，大窗面海，配办公桌，适合远程办公。步行可到海滩和万泰海鲜市场，骑车 10 分钟上山茶半岛。"],
      "zh-TW": ["萬泰海景套房", "35㎡ 海景套房，位於安靜的萬泰漁村，靠近山茶半島。", "採光好，大窗面海，配辦公桌，適合遠端工作。步行可到海灘和萬泰海鮮市場，騎車 10 分鐘上山茶半島。"],
    },
  },
];

try {
  const [city] = await sql`select id from cities where code = 'da-nang' limit 1`;
  const [housing] = await sql`select id from modules where code = 'housing' and is_enabled = true limit 1`;
  if (!housing) throw new Error("The housing module is unavailable.");

  const [org] = await sql`
    insert into organizations (code, type, name, description, city_id, address_text, status, metadata, updated_at)
    values (${ORG.code}, ${ORG.type}, ${ORG.name}, ${ORG.description}, ${city?.id ?? null}, ${ORG.addressText}, 'active', ${sql.json(ORG.metadata)}, now())
    on conflict (code) do update set
      type = excluded.type,
      name = excluded.name,
      description = excluded.description,
      city_id = excluded.city_id,
      address_text = excluded.address_text,
      status = 'active',
      metadata = organizations.metadata || excluded.metadata,
      updated_at = now()
    returning id
  `;

  const now = new Date().toISOString();
  for (const item of listings) {
    const metadata = {
      ...item.meta,
      housingAvailabilityStatus: "available",
      availableFrom: "2026-11-15",
      imageUrl: photo(item.photos[0][0]),
      galleryUrls: item.photos.map(([id]) => photo(id)),
      photoCredit: "Unsplash (ảnh minh họa)",
      photoSources: item.photos.map(([, slug]) => unsplashPage(slug)),
      syncStatus: "published",
      inventoryUpdatedAt: now,
    };
    const [service] = await sql`
      insert into services (module_id, organization_id, code, price_from, currency, is_enabled, metadata, updated_at)
      values (${housing.id}, ${org.id}, ${item.code}, ${item.price}, 'VND', true, ${sql.json({ ...metadata, publishedAt: now })}, now())
      on conflict (code) do update set
        organization_id = excluded.organization_id,
        price_from = excluded.price_from,
        is_enabled = true,
        metadata = (services.metadata || excluded.metadata) || jsonb_build_object('publishedAt', coalesce(services.metadata->'publishedAt', excluded.metadata->'publishedAt')),
        updated_at = now()
      returning id
    `;
    for (const [locale, [name, summary, description]] of Object.entries(item.t)) {
      const full = `${description}\n\n${note[locale]}`;
      await sql`
        insert into service_translations (service_id, locale, name, summary, description)
        values (${service.id}, ${locale}, ${name}, ${summary}, ${full})
        on conflict (service_id, locale) do update set
          name = excluded.name,
          summary = excluded.summary,
          description = excluded.description
      `;
    }
  }

  console.log(JSON.stringify({ organization: ORG.name, organizationId: org.id, listings: listings.length }));
} finally {
  await sql.end();
}
