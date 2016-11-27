/**
 * @fileOverview TabList extension options handling file.
 * @author Arthur (ax330d) Gerkis
 * @version 1.0.5
 */

// jshint esversion:6

/**
 * Restores select box and checkbox state using the preferences stored in
 * chrome.storage.
 */
document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.sync.get({
    showBookmarks: false,
    showAllWindows: false,
    allowDebugLogs: false,
  }, function(items) {
    document.getElementById('show-bookmarks').checked = items.showBookmarks;
    document.getElementById('show-all-windows').checked = items.showAllWindows;
    document.getElementById('allow-debug-logs').checked = items.allowDebugLogs;
  });
});

/**
 * Saves options to chrome.storage.
 */
window.onload = function() {
  ['show-bookmarks',
    'show-all-windows',
    'allow-debug-logs'
  ].forEach(function(key) {
    document.getElementById(key).onclick = function(event) {
      chrome.storage.sync.set({
        showBookmarks: document.getElementById('show-bookmarks').checked,
        showAllWindows: document.getElementById('show-all-windows').checked,
        allowDebugLogs: document.getElementById('allow-debug-logs').checked,
      }, function() {
        // ...
      });
    };
  });
};
