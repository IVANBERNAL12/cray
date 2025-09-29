/**
 * ui-fixes.js
 * Defensive UI helper for AquaVision
 *
 * - Auto-hide chart loading overlays if charts never initialize
 * - Show friendly "No data available" messages inside chart wrappers
 * - Ensure chart objects have safe .resize() no-op to avoid uncaught TypeError
 * - React to global JS errors (API missing, chart errors, import errors) by removing blocking overlays and showing useful messages
 * - Provide small debug helpers exposed on window.__aquaUiFixes
 */

(function () {
  'use strict';

  // Config
  const OVERLAY_TIMEOUT_MS = 4200;
  const POLL_INTERVAL_MS = 350;
  const POLL_MAX_ATTEMPTS = 24;

  // Small helpers
  function $(id) { return document.getElementById(id); }
  function hasClass(el, cls) { return el && el.classList && el.classList.contains(cls); }
  function addClass(el, cls) { if (el && el.classList) el.classList.add(cls); }
  function removeClass(el, cls) { if (el && el.classList) el.classList.remove(cls); }
  function safe(fn) { try { fn(); } catch (e) { /* swallow */ } }

  // Overlay helpers
  function hideOverlayById(id) {
    const el = $(id);
    if (!el) return false;
    addClass(el, 'hidden');
    el.setAttribute('aria-hidden', 'true');
    return true;
  }
  function showOverlayById(id) {
    const el = $(id);
    if (!el) return false;
    removeClass(el, 'hidden');
    el.setAttribute('aria-hidden', 'false');
    return true;
  }

  // Chart wrapper discovery
  function findChartWrapperForCanvas(canvasId) {
    const canvas = $(canvasId);
    if (!canvas) return null;
    return canvas.closest('.chart-wrapper') || canvas.parentElement || null;
  }

  // Create / remove "no data" messages
  function createNoDataMessage(wrapper, text) {
    if (!wrapper) return null;
    let msg = wrapper.querySelector('.chart-no-data');
    if (msg) return msg;
    msg = document.createElement('div');
    msg.className = 'chart-no-data';
    msg.textContent = text || 'No data available.';
    msg.setAttribute('role', 'status');
    msg.setAttribute('aria-live', 'polite');
    msg.style.padding = '16px';
    msg.style.textAlign = 'center';
    msg.style.color = 'rgba(255,255,255,0.95)';
    wrapper.appendChild(msg);
    return msg;
  }
  function removeNoDataMessage(wrapper) {
    if (!wrapper) return;
    const msg = wrapper.querySelector('.chart-no-data');
    if (msg) msg.remove();
  }

  // Ensure Alerts area shows friendly empty state
  function ensureAlertsEmptyState() {
    const history = $('alertHistory') || $('alertList');
    if (!history) return;
    if (history.querySelector('.alert-item')) return;
    if (history.querySelector('.no-alerts')) return;
    history.innerHTML = `
      <div class="no-alerts" style="display:flex;align-items:center;gap:12px;color:rgba(255,255,255,0.9);padding:14px">
        <i class="fas fa-info-circle" style="font-size:18px;opacity:0.95"></i>
        <div style="opacity:0.95">No alerts in history</div>
      </div>
    `;
  }

  // Patch chart object so resize is safe (prevents "resize is not a function" errors)
  function patchChartResizeIfMissing(chartObj) {
    if (!chartObj || typeof chartObj !== 'object') return;
    if (typeof chartObj.resize === 'function') return;
    chartObj.resize = function () {
      try {
        if (typeof chartObj.chart === 'object' && typeof chartObj.chart.resize === 'function') {
          chartObj.chart.resize();
          return;
        }
        if (typeof chartObj.chartInstance === 'object' && typeof chartObj.chartInstance.resize === 'function') {
          chartObj.chartInstance.resize();
          return;
        }
      } catch (e) {
        // swallow - best effort
      }
    };
  }

  // Hide overlays when chart globals are ready, remove no-data messages
  function tryHideOverlaysIfChartsReady() {
    try {
      if (window.temperatureChart && typeof window.temperatureChart.updateData === 'function') {
        patchChartResizeIfMissing(window.temperatureChart);
        hideOverlayById('tempChartOverlay');
        const wrapper = findChartWrapperForCanvas('temperatureChart');
        removeNoDataMessage(wrapper);
      }
      if (window.phChart && typeof window.phChart.updateData === 'function') {
        patchChartResizeIfMissing(window.phChart);
        hideOverlayById('phChartOverlay');
        const wrapper = findChartWrapperForCanvas('phChart');
        removeNoDataMessage(wrapper);
      }
      if (window.historicalChart && typeof window.historicalChart.updateData === 'function') {
        patchChartResizeIfMissing(window.historicalChart);
        hideOverlayById('historicalChartOverlay');
        const wrapper = findChartWrapperForCanvas('historicalChart');
        removeNoDataMessage(wrapper);
      }
    } catch (e) {
      console.warn('ui-fixes: error in tryHideOverlaysIfChartsReady', e);
    }
  }

  // After load: poll for chart globals quickly, then if not ready after timeout hide overlays and show messages
  document.addEventListener('DOMContentLoaded', () => {
    ensureAlertsEmptyState();

    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      tryHideOverlaysIfChartsReady();
      if (attempts >= POLL_MAX_ATTEMPTS) clearInterval(poll);
    }, POLL_INTERVAL_MS);

    setTimeout(() => {
      const tempOverlay = $('tempChartOverlay');
      const tempReady = window.temperatureChart && typeof window.temperatureChart.updateData === 'function';
      if (tempOverlay && !hasClass(tempOverlay, 'hidden')) {
        if (!tempReady) {
          hideOverlayById('tempChartOverlay');
          const wrapper = findChartWrapperForCanvas('temperatureChart');
          if (wrapper) createNoDataMessage(wrapper, 'No live temperature data available.');
        } else {
          hideOverlayById('tempChartOverlay');
        }
      }

      const phOverlay = $('phChartOverlay');
      const phReady = window.phChart && typeof window.phChart.updateData === 'function';
      if (phOverlay && !hasClass(phOverlay, 'hidden')) {
        if (!phReady) {
          hideOverlayById('phChartOverlay');
          const wrapper = findChartWrapperForCanvas('phChart');
          if (wrapper) createNoDataMessage(wrapper, 'No live pH data available.');
        } else {
          hideOverlayById('phChartOverlay');
        }
      }

      const histOverlay = $('historicalChartOverlay');
      const histReady = window.historicalChart && typeof window.historicalChart.updateData === 'function';
      if (histOverlay && !hasClass(histOverlay, 'hidden')) {
        if (!histReady) {
          hideOverlayById('historicalChartOverlay');
          const wrapper = findChartWrapperForCanvas('historicalChart');
          if (wrapper) createNoDataMessage(wrapper, 'No historical data available for the selected date range.');
        } else {
          hideOverlayById('historicalChartOverlay');
        }
      }
    }, OVERLAY_TIMEOUT_MS);
  });

  // Global error handler: helps to recover UI on fatal script errors (e.g., API undefined, syntax errors)
  window.addEventListener('error', (ev) => {
    try {
      const msg = ev && ev.message ? ev.message.toString() : '';
      if (/API is not defined|Cannot use import statement|Unexpected token|SyntaxError|ReferenceError: ConnectionMonitoring is not defined|has already been declared/i.test(msg)) {
        hideOverlayById('historicalChartOverlay');
        hideOverlayById('tempChartOverlay');
        hideOverlayById('phChartOverlay');

        const histWrapper = findChartWrapperForCanvas('historicalChart');
        if (histWrapper) createNoDataMessage(histWrapper, 'Historical chart unavailable due to a script error. Check browser console.');
        const tempWrapper = findChartWrapperForCanvas('temperatureChart');
        if (tempWrapper) createNoDataMessage(tempWrapper, 'Temperature chart unavailable due to a script error. Check browser console.');
        const phWrapper = findChartWrapperForCanvas('phChart');
        if (phWrapper) createNoDataMessage(phWrapper, 'pH chart unavailable due to a script error. Check browser console.');

        ensureAlertsEmptyState();

        safe(() => {
          if (window.aquaVisionApp && window.aquaVisionApp.alertSystem && typeof window.aquaVisionApp.alertSystem.addAlert === 'function') {
            window.aquaVisionApp.alertSystem.addAlert('error', 'A script error prevented full UI initialization. See console.');
            if (typeof window.aquaVisionApp.refreshAlertHistory === 'function') window.aquaVisionApp.refreshAlertHistory();
          }
        });
      }
    } catch (ignore) {}
  });

  // Handle unhandled promise rejections similarly
  window.addEventListener('unhandledrejection', (ev) => {
    try {
      const reason = ev && ev.reason ? (ev.reason.message || String(ev.reason)) : '';
      if (/API is not defined|Failed to fetch|NetworkError|SyntaxError/i.test(reason)) {
        hideOverlayById('historicalChartOverlay');
        const wrapper = findChartWrapperForCanvas('historicalChart');
        if (wrapper) createNoDataMessage(wrapper, 'Failed to load historical data (network or script error). Check console.');
        ensureAlertsEmptyState();
      }
    } catch (ignore) {}
  });

  // Listen for custom events dispatched by main.js/charts.js
  document.addEventListener('historicalDataLoaded', () => {
    hideOverlayById('historicalChartOverlay');
    const wrapper = findChartWrapperForCanvas('historicalChart');
    removeNoDataMessage(wrapper);
    tryHideOverlaysIfChartsReady();
  });

  // Generic chartReady event: { detail: { id: 'historicalChart' } }
  document.addEventListener('chartReady', (ev) => {
    const id = ev && ev.detail && ev.detail.id;
    if (!id) { tryHideOverlaysIfChartsReady(); return; }
    if (id === 'historicalChart' || id === 'historical') hideOverlayById('historicalChartOverlay');
    if (id === 'temperatureChart' || id === 'temp') hideOverlayById('tempChartOverlay');
    if (id === 'phChart' || id === 'ph') hideOverlayById('phChartOverlay');
    const wrapper = findChartWrapperForCanvas(id);
    removeNoDataMessage(wrapper);
  });

  // If the app emits sensorDataUpdate (API client did earlier), hide overlays
  document.addEventListener('sensorDataUpdate', () => {
    tryHideOverlaysIfChartsReady();
  });

  // Provide a manual public API for debugging
  window.__aquaUiFixes = {
    hideOverlay: hideOverlayById,
    showOverlay: showOverlayById,
    createNoDataMessage,
    removeNoDataMessage,
    tryHideOverlaysIfChartsReady,
    patchChartResizeIfMissing
  };

  // Also patch chart globals if they appear later than load (watch for assignments)
  (function watchForChartGlobals() {
    let attempts = 0;
    const t = setInterval(() => {
      attempts++;
      try {
        if (window.temperatureChart) patchChartResizeIfMissing(window.temperatureChart);
        if (window.phChart) patchChartResizeIfMissing(window.phChart);
        if (window.historicalChart) patchChartResizeIfMissing(window.historicalChart);

        tryHideOverlaysIfChartsReady();

        if (attempts > POLL_MAX_ATTEMPTS) clearInterval(t);
      } catch (e) {
        console.warn('ui-fixes watch error', e);
      }
    }, POLL_INTERVAL_MS);
  })();

})();