// 诗歌页面自动加载衬线体样式
// 检测 URL 路径中是否包含 /poems/，给 body 加 class
(function() {
  if (window.location.pathname.indexOf('/poems/') !== -1) {
    document.body.classList.add('page-poems');
  }
})();
