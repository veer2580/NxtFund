(function () {
  var useLocalBackend = location.protocol === 'file:' ||
    (location.protocol.indexOf('http') === 0 && location.port && location.port !== '3000');
  window.API_BASE = useLocalBackend ? 'http://localhost:3000' : '';
})();