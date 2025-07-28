// memory-monitor.js

(function MemoryMonitor(config) {
  const {
    thresholdMB = 400,
    reportUrl = '/api/memory-report',
    intervalMs = 5000,
    warnUser = false,
    verbose = false
  } = config || {};

  if (!performance.memory) {
    console.warn('[MemoryMonitor] performance.memory is not supported in this browser.');
    return;
  }

  let hasReported = false;

  function formatMB(bytes) {
    return (bytes / 1024 / 1024).toFixed(2);
  }

  function reportToServer(usedMB, totalMB) {
    const payload = {
      usedMB,
      totalMB,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: Date.now()
    };

    if (verbose) console.log('[MemoryMonitor] Sending report:', payload);

    try {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(reportUrl, blob);
      } else {
        fetch(reportUrl, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' }
        }).catch((err) => console.warn('[MemoryMonitor] Fetch error:', err));
      }
    } catch (err) {
      console.error('[MemoryMonitor] Reporting failed:', err);
    }
  }

  function monitor() {
    const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
    const usedMB = parseFloat(formatMB(usedJSHeapSize));
    const totalMB = parseFloat(formatMB(totalJSHeapSize));

    if (verbose) {
      console.log(`[MemoryMonitor] Heap: ${usedMB} MB / ${totalMB} MB`);
    }

    if (usedMB >= thresholdMB && !hasReported) {
      hasReported = true;
      reportToServer(usedMB, totalMB);

      if (warnUser) {
        alert(`High memory usage detected: ${usedMB} MB`);
      }
    }

    if (hasReported && usedMB < thresholdMB * 0.8) {
      hasReported = false;
      if (verbose) console.log('[MemoryMonitor] Memory dropped below threshold again.');
    }
  }

  setInterval(monitor, intervalMs);

  window.addEventListener('beforeunload', () => {
    if (verbose) console.log('[MemoryMonitor] Sending unload report.');
    reportToServer(-1, -1);
  });

})(window.MemoryMonitorConfig || {});
