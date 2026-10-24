/**
 * Vercel Speed Insights Integration
 * Initializes and injects Speed Insights for performance monitoring
 */
(function() {
  // Initialize Speed Insights queue
  window.si = window.si || function() {
    (window.siq = window.siq || []).push(arguments);
  };
  
  // Load the Speed Insights script
  var script = document.createElement('script');
  script.src = '/_vercel/speed-insights/script.js';
  script.defer = true;
  document.head.appendChild(script);
})();
