// Metro dành riêng cho mini app: shared module lấy từ host, serializer bọc bundle riêng.
module.exports = require("@zhaoxi/miniapp-sdk/metro").createMiniAppMetroConfig(__dirname);
