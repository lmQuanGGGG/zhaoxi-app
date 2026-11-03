// Bản mini app của threeLib.ts: tải đúng three.js r128 (giống hệt assets/three.min.js, có kiểm SRI)
// từ CDN thay vì nhúng 600 KB vào bundle. Mất mạng thì quả cầu không hiện, chữ của màn chờ vẫn hiện.
export const THREE_LIB_SCRIPT =
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" integrity="sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu" crossorigin="anonymous"></script>';
