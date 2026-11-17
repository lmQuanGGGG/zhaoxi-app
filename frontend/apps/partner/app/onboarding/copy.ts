import type { ZhaoXiLocale } from "@zhaoxi/i18n";
import type { ErrorCode, ModuleCode, StepKey } from "./form";

type Copy = {
  eyebrow: string;
  title: string;
  lede: string;
  perks: [string, string, string];
  stepOf: (n: number, total: number) => string;
  steps: Record<StepKey, { label: string; title: string; desc: string }>;
  modules: Record<ModuleCode, { label: string; desc: string }>;
  f: {
    businessName: string; businessNamePh: string; businessNameHint: string;
    intro: string; introPh: string;
    city: string; cityOther: string; cityOtherPh: string;
    address: string; addressHint: string; pointSet: string; pointMissing: string;
    contactName: string; contactNamePh: string;
    phone: string; phonePh: string; phoneHint: string;
    email: string; emailPh: string;
    license: string; licensePh: string; licenseHint: string;
    notes: string; notesPh: string;
    optional: string;
  };
  err: Record<ErrorCode, string>;
  a: { back: string; next: string; submit: string; submitting: string; edit: string; restart: string; retry: string; draftSaved: (time: string) => string; draftRestored: (time: string) => string };
  review: { agree: string; privacy: string; empty: string; checkFirst: string };
  status: { loading: string; loadError: string; authError: string; submitted: string; submitFailed: string };
  pending: { chip: string; title: string; body: string; sent: string; reviewing: string; open: string; sentAt: string; update: string };
  rejected: { chip: string; title: string; body: string; note: string; fix: string };
  approved: { chip: string; title: string; body: string; open: string; opening: string; openFailed: string; inApp: string };
  summary: { store: string; service: string; address: string; contact: string };
  hub: { stores: (n: number) => string; manage: string; inReview: string; newTitle: string; newBody: string; newButton: string; limit: (n: number) => string; editing: (name: string) => string };
  apiErrors: Record<string, string>;
  questionsTitle: (service: string) => string;
  multiHint: string;
};

export const onboardingCopy: Record<ZhaoXiLocale, Copy> = {
  "vi-VN": {
    eyebrow: "ZhaoXi Partner",
    title: "Mở gian hàng trên ZhaoXi",
    lede: "Điền hồ sơ trong khoảng 3 phút. ZhaoXi duyệt xong là gian hàng của bạn được tạo và bạn có thể bắt đầu nhận đơn.",
    perks: ["Miễn phí đăng ký", "Tự động lưu nháp", "Duyệt nhanh, báo ngay trong app"],
    stepOf: (n, total) => `Bước ${n}/${total}`,
    steps: {
      store: { label: "Gian hàng", title: "Thông tin gian hàng", desc: "Tên gian hàng là tên khách hàng thấy trên ZhaoXi." },
      service: { label: "Dịch vụ", title: "Bạn kinh doanh dịch vụ gì?", desc: "Chọn một loại dịch vụ chính. Bạn có thể bổ sung sau khi được duyệt." },
      location: { label: "Địa chỉ", title: "Địa chỉ gian hàng", desc: "Chọn đúng vị trí trên bản đồ để khách và tài xế tìm đến chính xác." },
      contact: { label: "Liên hệ", title: "Liên hệ & giấy tờ", desc: "ZhaoXi dùng thông tin này để xác minh và liên hệ khi duyệt hồ sơ." },
      review: { label: "Gửi hồ sơ", title: "Xem lại và gửi", desc: "Kiểm tra lại thông tin trước khi gửi cho ZhaoXi duyệt." },
    },
    modules: {
      food: { label: "Ẩm thực", desc: "Nhà hàng, quán ăn, cà phê, trà sữa" },
      market: { label: "Cửa hàng", desc: "Tạp hoá, đặc sản, mỹ phẩm, đồ dùng" },
      housing: { label: "Nhà ở", desc: "Cho thuê căn hộ, phòng, homestay" },
      travel: { label: "Du lịch", desc: "Tour, vé tham quan, hướng dẫn viên" },
      "car-rental": { label: "Thuê xe", desc: "Xe đưa đón, xe tự lái, xe máy" },
      translation: { label: "Phiên dịch", desc: "Phiên dịch Hoa – Việt, dịch giấy tờ" },
      visa: { label: "Visa & thủ tục", desc: "Gia hạn visa, giấy phép, hồ sơ" },
    },
    f: {
      businessName: "Tên gian hàng", businessNamePh: "Ví dụ: Bếp Nhà Hỷ", businessNameHint: "Nên trùng với biển hiệu hoặc tên trên giấy phép.",
      intro: "Giới thiệu ngắn", introPh: "Món/dịch vụ nổi bật, giờ mở cửa, điểm khác biệt…",
      city: "Thành phố", cityOther: "Khác", cityOtherPh: "Nhập tên thành phố",
      address: "Địa chỉ", addressHint: "Gõ địa chỉ rồi chọn gợi ý, hoặc chạm bản đồ để đặt ghim.", pointSet: "Đã ghim vị trí trên bản đồ", pointMissing: "Chưa ghim vị trí: ZhaoXi sẽ định vị theo địa chỉ chữ.",
      contactName: "Người liên hệ", contactNamePh: "Họ và tên",
      phone: "Số điện thoại", phonePh: "0905 123 456", phoneHint: "Số Việt Nam hoặc số quốc tế bắt đầu bằng +.",
      email: "Email", emailPh: "ban@vidu.com",
      license: "Giấy phép kinh doanh / Mã số thuế", licensePh: "Ví dụ: 0401234567", licenseHint: "Có thì duyệt nhanh hơn. Admin có thể hỏi thêm ảnh giấy tờ.",
      notes: "Ghi chú cho ZhaoXi", notesPh: "Điều bạn muốn ZhaoXi biết khi duyệt hồ sơ",
      optional: "không bắt buộc",
    },
    err: { required: "Vui lòng nhập thông tin này.", tooShort: "Nội dung quá ngắn.", tooLong: "Nội dung quá dài.", phone: "Số điện thoại chưa đúng.", email: "Email chưa đúng.", agree: "Bạn cần đồng ý trước khi gửi.", number: "Chỉ nhập số.", choose: "Vui lòng chọn ít nhất một mục." },
    a: { back: "Quay lại", next: "Tiếp tục", submit: "Gửi hồ sơ", submitting: "Đang gửi…", edit: "Sửa", restart: "Làm lại từ đầu", retry: "Thử lại", draftSaved: (time) => `Đã lưu nháp lúc ${time}`, draftRestored: (time) => `Đã mở lại bản nháp lưu lúc ${time}.` },
    review: { agree: "Tôi xác nhận thông tin trên là đúng và đồng ý với", privacy: "chính sách quyền riêng tư của ZhaoXi Partner", empty: "—", checkFirst: "Còn thông tin chưa hợp lệ, hãy kiểm tra bước được đánh dấu." },
    status: { loading: "Đang tải hồ sơ…", loadError: "Chưa tải được trạng thái hồ sơ. Kiểm tra mạng rồi thử lại.", authError: "Phiên đăng nhập đã hết hạn. Hãy mở lại từ app ZhaoXi hoặc đăng nhập lại.", submitted: "Đã gửi hồ sơ! ZhaoXi sẽ báo cho bạn khi có kết quả.", submitFailed: "Chưa gửi được hồ sơ. Vui lòng thử lại." },
    pending: { chip: "Chờ duyệt", title: "Hồ sơ đang chờ duyệt", body: "ZhaoXi đang xem hồ sơ của bạn. Khi được duyệt, gian hàng sẽ tự động được tạo.", sent: "Đã gửi hồ sơ", reviewing: "ZhaoXi xem xét", open: "Mở gian hàng", sentAt: "Ngày gửi", update: "Cập nhật hồ sơ" },
    rejected: { chip: "Cần bổ sung", title: "Hồ sơ cần chỉnh sửa", body: "ZhaoXi chưa thể duyệt hồ sơ này. Hãy xem góp ý, sửa lại và gửi lại.", note: "Góp ý của ZhaoXi", fix: "Sửa hồ sơ và gửi lại" },
    approved: { chip: "Đã duyệt", title: "Gian hàng đã được duyệt", body: "Chúc mừng! Bạn có thể vào khu quản lý để thêm sản phẩm, giờ mở cửa và bắt đầu nhận đơn.", open: "Mở quản lý gian hàng", opening: "Đang mở…", openFailed: "Chưa mở được khu quản lý. Hãy đăng nhập lại bằng tài khoản đối tác.", inApp: "Trong app ZhaoXi, mở lại mục Gian hàng để vào thẳng Quản lý gian hàng." },
    summary: { store: "Gian hàng", service: "Dịch vụ", address: "Địa chỉ", contact: "Liên hệ" },
    hub: { stores: (n) => (n > 1 ? `${n} gian hàng của bạn` : "Gian hàng của bạn"), manage: "Quản lý", inReview: "Hồ sơ đang xử lý", newTitle: "Đăng ký gian hàng mới", newBody: "Mở thêm gian hàng khác bằng chính tài khoản này. Mỗi gian hàng có hồ sơ và được duyệt riêng.", newButton: "Đăng ký gian hàng mới", limit: (n) => `Bạn đang có ${n} hồ sơ chờ duyệt. Hãy chờ kết quả trước khi đăng ký thêm.`, editing: (name) => `Đang sửa hồ sơ: ${name}` },
    apiErrors: { ONBOARDING_TOO_MANY_OPEN_APPLICATIONS: "Bạn đã có quá nhiều hồ sơ chờ duyệt. Hãy chờ kết quả trước khi đăng ký thêm.", ONBOARDING_ALREADY_APPROVED: "Hồ sơ này đã được duyệt nên không sửa được nữa. Hãy đăng ký gian hàng mới.", ONBOARDING_NOT_FOUND: "Không tìm thấy hồ sơ này. Hãy tải lại trang.", PARTNER_BUSINESS_NAME_REQUIRED: "Vui lòng nhập tên gian hàng." },
    questionsTitle: (service) => `Thêm về dịch vụ ${service.toLowerCase()}`, multiHint: "Chọn một hoặc nhiều mục.",
  },
  "en-US": {
    eyebrow: "ZhaoXi Partner",
    title: "Open your store on ZhaoXi",
    lede: "The form takes about 3 minutes. Once ZhaoXi approves it, your store is created and you can start taking orders.",
    perks: ["Free to apply", "Drafts save automatically", "Quick review, notified in the app"],
    stepOf: (n, total) => `Step ${n} of ${total}`,
    steps: {
      store: { label: "Store", title: "Store details", desc: "Your store name is what customers see on ZhaoXi." },
      service: { label: "Service", title: "What do you offer?", desc: "Pick one main service. You can add more after approval." },
      location: { label: "Address", title: "Store address", desc: "Pin the exact spot on the map so customers and drivers find you." },
      contact: { label: "Contact", title: "Contact & documents", desc: "ZhaoXi uses this to verify your store and reach you during review." },
      review: { label: "Submit", title: "Review and submit", desc: "Check everything before sending it to ZhaoXi for review." },
    },
    modules: {
      food: { label: "Food & drinks", desc: "Restaurants, eateries, cafés, bubble tea" },
      market: { label: "Shop", desc: "Groceries, specialties, cosmetics, goods" },
      housing: { label: "Housing", desc: "Apartments, rooms, homestays for rent" },
      travel: { label: "Travel", desc: "Tours, tickets, local guides" },
      "car-rental": { label: "Car rental", desc: "Transfers, self-drive cars, motorbikes" },
      translation: { label: "Translation", desc: "Chinese–Vietnamese interpreting, documents" },
      visa: { label: "Visa & permits", desc: "Visa extensions, permits, paperwork" },
    },
    f: {
      businessName: "Store name", businessNamePh: "e.g. Hy's Kitchen", businessNameHint: "Ideally the same as your signboard or business licence.",
      intro: "Short introduction", introPh: "Signature dishes or services, opening hours, what makes you different…",
      city: "City", cityOther: "Other", cityOtherPh: "Enter the city",
      address: "Address", addressHint: "Type the address and pick a suggestion, or tap the map to drop the pin.", pointSet: "Location pinned on the map", pointMissing: "No pin yet: ZhaoXi will locate the written address.",
      contactName: "Contact person", contactNamePh: "Full name",
      phone: "Phone number", phonePh: "+84 905 123 456", phoneHint: "A Vietnamese number, or an international one starting with +.",
      email: "Email", emailPh: "you@example.com",
      license: "Business licence / Tax ID", licensePh: "e.g. 0401234567", licenseHint: "Speeds up review. Admin may ask for a photo of the document.",
      notes: "Notes for ZhaoXi", notesPh: "Anything ZhaoXi should know when reviewing",
      optional: "optional",
    },
    err: { required: "Please fill this in.", tooShort: "Too short.", tooLong: "Too long.", phone: "This phone number doesn't look right.", email: "This email doesn't look right.", agree: "Please agree before submitting.", number: "Numbers only.", choose: "Please pick at least one." },
    a: { back: "Back", next: "Continue", submit: "Submit application", submitting: "Submitting…", edit: "Edit", restart: "Start over", retry: "Retry", draftSaved: (time) => `Draft saved at ${time}`, draftRestored: (time) => `Restored your draft from ${time}.` },
    review: { agree: "I confirm these details are correct and agree to the", privacy: "ZhaoXi Partner privacy policy", empty: "—", checkFirst: "Some details still need attention; check the highlighted step." },
    status: { loading: "Loading your application…", loadError: "Couldn't load your application status. Check your connection and try again.", authError: "Your session has expired. Reopen this page from the ZhaoXi app or sign in again.", submitted: "Application sent! ZhaoXi will let you know the result.", submitFailed: "Couldn't submit the application. Please try again." },
    pending: { chip: "In review", title: "Your application is in review", body: "ZhaoXi is reviewing your application. Your store is created automatically once it's approved.", sent: "Application sent", reviewing: "ZhaoXi review", open: "Store opens", sentAt: "Sent on", update: "Update application" },
    rejected: { chip: "Needs changes", title: "Your application needs changes", body: "ZhaoXi couldn't approve this application yet. Read the feedback, fix it and send it again.", note: "Feedback from ZhaoXi", fix: "Fix and resubmit" },
    approved: { chip: "Approved", title: "Your store is approved", body: "Congratulations! Open the store workspace to add products, set opening hours and start taking orders.", open: "Open store management", opening: "Opening…", openFailed: "Couldn't open the workspace. Please sign in again with your partner account.", inApp: "In the ZhaoXi app, open Store again to go straight to store management." },
    summary: { store: "Store", service: "Service", address: "Address", contact: "Contact" },
    hub: { stores: (n) => (n > 1 ? `Your ${n} stores` : "Your store"), manage: "Manage", inReview: "Applications in progress", newTitle: "Register a new store", newBody: "Open another store with this same account. Each store has its own application and review.", newButton: "Register a new store", limit: (n) => `You have ${n} applications waiting for review. Wait for a result before applying again.`, editing: (name) => `Editing application: ${name}` },
    apiErrors: { ONBOARDING_TOO_MANY_OPEN_APPLICATIONS: "Too many applications are waiting for review. Wait for a result before applying again.", ONBOARDING_ALREADY_APPROVED: "This application is already approved and can't be edited. Register a new store instead.", ONBOARDING_NOT_FOUND: "This application wasn't found. Reload the page.", PARTNER_BUSINESS_NAME_REQUIRED: "Please enter a store name." },
    questionsTitle: (service) => `About your ${service.toLowerCase()} business`, multiHint: "Pick one or more.",
  },
  "zh-CN": {
    eyebrow: "赵喜合作伙伴",
    title: "在赵喜开店",
    lede: "填写资料约需 3 分钟。赵喜审核通过后会自动创建您的店铺，即可开始接单。",
    perks: ["免费申请", "自动保存草稿", "快速审核，应用内通知"],
    stepOf: (n, total) => `第 ${n} 步，共 ${total} 步`,
    steps: {
      store: { label: "店铺", title: "店铺信息", desc: "店铺名称会展示给赵喜上的顾客。" },
      service: { label: "服务", title: "您经营什么服务？", desc: "请选择一项主营服务，审核通过后可再添加。" },
      location: { label: "地址", title: "店铺地址", desc: "请在地图上标出准确位置，方便顾客和骑手找到您。" },
      contact: { label: "联系", title: "联系方式与证件", desc: "赵喜将用这些信息核实店铺，并在审核时与您联系。" },
      review: { label: "提交", title: "确认并提交", desc: "提交给赵喜审核前，请再检查一遍。" },
    },
    modules: {
      food: { label: "餐饮美食", desc: "餐厅、小吃、咖啡、奶茶" },
      market: { label: "商店超市", desc: "杂货、特产、美妆、日用品" },
      housing: { label: "租房住宿", desc: "公寓、单间、民宿出租" },
      travel: { label: "旅游线路", desc: "旅游团、门票、导游" },
      "car-rental": { label: "包车租车", desc: "接送、自驾租车、摩托车" },
      translation: { label: "翻译服务", desc: "中越口译、文件翻译" },
      visa: { label: "签证证件", desc: "签证续签、许可证、手续办理" },
    },
    f: {
      businessName: "店铺名称", businessNamePh: "例如：喜家厨房", businessNameHint: "建议与招牌或营业执照上的名称一致。",
      intro: "店铺简介", introPh: "招牌菜品或服务、营业时间、特色…",
      city: "城市", cityOther: "其他", cityOtherPh: "请输入城市",
      address: "地址", addressHint: "输入地址后选择建议，或点击地图放置定位。", pointSet: "已在地图上标记位置", pointMissing: "尚未标记：赵喜将按文字地址定位。",
      contactName: "联系人", contactNamePh: "姓名",
      phone: "手机号码", phonePh: "+84 905 123 456", phoneHint: "越南号码，或以 + 开头的国际号码。",
      email: "邮箱", emailPh: "you@example.com",
      license: "营业执照 / 税号", licensePh: "例如：0401234567", licenseHint: "填写后审核更快，管理员可能会要求提供证件照片。",
      notes: "给赵喜的备注", notesPh: "审核时希望赵喜了解的信息",
      optional: "选填",
    },
    err: { required: "请填写此项。", tooShort: "内容太短。", tooLong: "内容太长。", phone: "手机号码格式不正确。", email: "邮箱格式不正确。", agree: "提交前请先同意。", number: "请只填写数字。", choose: "请至少选择一项。" },
    a: { back: "上一步", next: "继续", submit: "提交申请", submitting: "正在提交…", edit: "修改", restart: "重新填写", retry: "重试", draftSaved: (time) => `已于 ${time} 保存草稿`, draftRestored: (time) => `已恢复 ${time} 保存的草稿。` },
    review: { agree: "我确认以上信息真实，并同意", privacy: "赵喜合作伙伴隐私政策", empty: "—", checkFirst: "仍有信息需要修改，请查看标记的步骤。" },
    status: { loading: "正在加载申请…", loadError: "无法加载申请状态，请检查网络后重试。", authError: "登录已过期，请从赵喜应用重新打开或重新登录。", submitted: "申请已提交！赵喜会通知您审核结果。", submitFailed: "提交失败，请重试。" },
    pending: { chip: "审核中", title: "申请正在审核", body: "赵喜正在审核您的申请，通过后会自动创建店铺。", sent: "已提交申请", reviewing: "赵喜审核", open: "店铺开通", sentAt: "提交时间", update: "更新申请" },
    rejected: { chip: "需补充", title: "申请需要修改", body: "赵喜暂时无法通过此申请，请查看意见，修改后重新提交。", note: "赵喜的意见", fix: "修改并重新提交" },
    approved: { chip: "已通过", title: "店铺已通过审核", body: "恭喜！进入店铺管理即可添加商品、设置营业时间并开始接单。", open: "进入店铺管理", opening: "正在打开…", openFailed: "无法打开店铺管理，请使用合作伙伴账号重新登录。", inApp: "在赵喜应用中再次打开“店铺”，即可直接进入店铺管理。" },
    summary: { store: "店铺", service: "服务", address: "地址", contact: "联系方式" },
    hub: { stores: (n) => (n > 1 ? `您的 ${n} 家店铺` : "您的店铺"), manage: "管理", inReview: "处理中的申请", newTitle: "开通新店铺", newBody: "用同一个账号再开一家店铺，每家店铺单独提交资料、单独审核。", newButton: "开通新店铺", limit: (n) => `您有 ${n} 份申请正在审核，请等结果出来后再申请。`, editing: (name) => `正在修改申请：${name}` },
    apiErrors: { ONBOARDING_TOO_MANY_OPEN_APPLICATIONS: "待审核的申请过多，请等结果出来后再申请。", ONBOARDING_ALREADY_APPROVED: "此申请已通过审核，无法修改，请开通新店铺。", ONBOARDING_NOT_FOUND: "找不到此申请，请刷新页面。", PARTNER_BUSINESS_NAME_REQUIRED: "请填写店铺名称。" },
    questionsTitle: (service) => `${service}业务信息`, multiHint: "可多选。",
  },
  "zh-TW": {
    eyebrow: "趙喜合作夥伴",
    title: "在趙喜開店",
    lede: "填寫資料約需 3 分鐘。趙喜審核通過後會自動建立您的店鋪，即可開始接單。",
    perks: ["免費申請", "自動儲存草稿", "快速審核，應用內通知"],
    stepOf: (n, total) => `第 ${n} 步，共 ${total} 步`,
    steps: {
      store: { label: "店鋪", title: "店鋪資訊", desc: "店鋪名稱會顯示給趙喜上的顧客。" },
      service: { label: "服務", title: "您經營什麼服務？", desc: "請選擇一項主要服務，審核通過後可再新增。" },
      location: { label: "地址", title: "店鋪地址", desc: "請在地圖上標出準確位置，方便顧客與外送員找到您。" },
      contact: { label: "聯絡", title: "聯絡方式與證件", desc: "趙喜會用這些資訊核實店鋪，並在審核時與您聯絡。" },
      review: { label: "送出", title: "確認並送出", desc: "送交趙喜審核前，請再檢查一次。" },
    },
    modules: {
      food: { label: "餐飲美食", desc: "餐廳、小吃、咖啡、手搖飲" },
      market: { label: "商店超市", desc: "雜貨、特產、美妝、日用品" },
      housing: { label: "租屋住宿", desc: "公寓、雅房、民宿出租" },
      travel: { label: "旅遊行程", desc: "旅遊團、門票、導遊" },
      "car-rental": { label: "包車租車", desc: "接送、自駕租車、機車" },
      translation: { label: "翻譯服務", desc: "中越口譯、文件翻譯" },
      visa: { label: "簽證證件", desc: "簽證延期、許可證、手續辦理" },
    },
    f: {
      businessName: "店鋪名稱", businessNamePh: "例如：喜家廚房", businessNameHint: "建議與招牌或營業登記上的名稱一致。",
      intro: "店鋪簡介", introPh: "招牌餐點或服務、營業時間、特色…",
      city: "城市", cityOther: "其他", cityOtherPh: "請輸入城市",
      address: "地址", addressHint: "輸入地址後選擇建議，或點擊地圖放置定位。", pointSet: "已在地圖上標記位置", pointMissing: "尚未標記：趙喜將依文字地址定位。",
      contactName: "聯絡人", contactNamePh: "姓名",
      phone: "手機號碼", phonePh: "+84 905 123 456", phoneHint: "越南號碼，或以 + 開頭的國際號碼。",
      email: "電子郵件", emailPh: "you@example.com",
      license: "營業登記 / 稅籍編號", licensePh: "例如：0401234567", licenseHint: "填寫後審核更快，管理員可能會要求提供證件照片。",
      notes: "給趙喜的備註", notesPh: "審核時希望趙喜了解的資訊",
      optional: "選填",
    },
    err: { required: "請填寫此欄。", tooShort: "內容太短。", tooLong: "內容太長。", phone: "手機號碼格式不正確。", email: "電子郵件格式不正確。", agree: "送出前請先同意。", number: "請只填寫數字。", choose: "請至少選擇一項。" },
    a: { back: "上一步", next: "繼續", submit: "送出申請", submitting: "正在送出…", edit: "修改", restart: "重新填寫", retry: "重試", draftSaved: (time) => `已於 ${time} 儲存草稿`, draftRestored: (time) => `已還原 ${time} 儲存的草稿。` },
    review: { agree: "我確認以上資訊屬實，並同意", privacy: "趙喜合作夥伴隱私權政策", empty: "—", checkFirst: "仍有資訊需要修改，請查看標記的步驟。" },
    status: { loading: "正在載入申請…", loadError: "無法載入申請狀態，請檢查網路後重試。", authError: "登入已過期，請從趙喜應用重新開啟或重新登入。", submitted: "申請已送出！趙喜會通知您審核結果。", submitFailed: "送出失敗，請重試。" },
    pending: { chip: "審核中", title: "申請正在審核", body: "趙喜正在審核您的申請，通過後會自動建立店鋪。", sent: "已送出申請", reviewing: "趙喜審核", open: "店鋪開通", sentAt: "送出時間", update: "更新申請" },
    rejected: { chip: "需補充", title: "申請需要修改", body: "趙喜暫時無法通過此申請，請查看意見，修改後重新送出。", note: "趙喜的意見", fix: "修改並重新送出" },
    approved: { chip: "已通過", title: "店鋪已通過審核", body: "恭喜！進入店鋪管理即可新增商品、設定營業時間並開始接單。", open: "進入店鋪管理", opening: "正在開啟…", openFailed: "無法開啟店鋪管理，請使用合作夥伴帳號重新登入。", inApp: "在趙喜應用中再次開啟「店鋪」，即可直接進入店鋪管理。" },
    summary: { store: "店鋪", service: "服務", address: "地址", contact: "聯絡方式" },
    hub: { stores: (n) => (n > 1 ? `您的 ${n} 家店鋪` : "您的店鋪"), manage: "管理", inReview: "處理中的申請", newTitle: "開通新店鋪", newBody: "用同一個帳號再開一家店鋪，每家店鋪單獨送出資料、單獨審核。", newButton: "開通新店鋪", limit: (n) => `您有 ${n} 份申請正在審核，請等結果出來後再申請。`, editing: (name) => `正在修改申請：${name}` },
    apiErrors: { ONBOARDING_TOO_MANY_OPEN_APPLICATIONS: "待審核的申請過多，請等結果出來後再申請。", ONBOARDING_ALREADY_APPROVED: "此申請已通過審核，無法修改，請開通新店鋪。", ONBOARDING_NOT_FOUND: "找不到此申請，請重新整理頁面。", PARTNER_BUSINESS_NAME_REQUIRED: "請填寫店鋪名稱。" },
    questionsTitle: (service) => `${service}業務資訊`, multiHint: "可複選。",
  },
};

export const LOCALE_SHORT: Record<ZhaoXiLocale, string> = { "vi-VN": "VI", "en-US": "EN", "zh-CN": "简", "zh-TW": "繁" };
