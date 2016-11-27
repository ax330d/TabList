/**
 * @fileOverview TabList extension main file.
 * @author Arthur (ax330d) Gerkis
 * @version 1.0.5
 */

// jshint esversion:6

// TODO: (future) show "Other bookmarks"
// TODO: (future) add context menus to bookmarks
// TODO: (future) add localisation (ru, en)?
// TODO: (future) maybe save list of tabs? How to do that securely?
// TODO: (future) add tab groups (or colors?) Implement with context menus?
// TODO: (future) add some animations?
// TODO: (future) drag n drop (tabs reordering)
// TODO: (future) move storage from sync to local? Make option to choose?
// TODO: (future) show screenshots? (https://louisrli.github.io/blog/2013/01/16/javascript-canvas-screenshot/)
// TODO: (ongoing) cleanup JS, see chrome://resources/js/cr.js, see google javascript code guidelines
// TODO: (ongoing) cleanup CSS
// TODO: (ongoing) check for errors and bugs


var tl = tl || function() {
  'use strict';

  /**
   * Tabs counter. Starts from 1 because we aleardy have opened one tab.
   */
  let tabsCounter = 1;

  /**
   * Required to filter out ids which do not belong to current window.
   */
  let currentWindowId = null;

  /**
   * Required to filter out ids which do not belong to current window.
   */
  let listOfTabsIds = [];

  /**
   * Flag identifying if to show all windows.
   */
  let doShowAllWindows = false;

  /**
   * Log all messages in debug mode.
   */
  let isDebugMode = false;

  /**
   * Flag identifying if currently is discarding some tab.
   */
  let isCurrentlyDiscarding = false;

  /**
   * Previous tab identificator (used in tab discarding).
   */
  let previousTabId = -1;

  /**
   * Prints text to console.
   * @param {string} text Text to print in console.
   */
  function _log(text) {
    if (!isDebugMode) {
      return;
    }

    console.trace('TabList: ' + text);
  }

  /**
   * Updates tab box information.
   * @param {Object} tab Tab object.
   */
  function _updateTab(tab) {

    // If we are discarding some tab, then it will get new id, replace id.
    if (isCurrentlyDiscarding) {
      let dataContainer = document.querySelector('[data-tab-id="' + previousTabId + '"]');
      if (dataContainer) {
        dataContainer.setAttribute('data-tab-id', tab.id);
      }
    }

    if (false === listOfTabsIds.includes(tab.id)) {
      return;
    }

    let dataContainer = document.querySelector('[data-tab-id="' + tab.id + '"]');

    let faviconContainerImage = dataContainer.querySelector('.favicon-container-image');
    faviconContainerImage.src = tab.favIconUrl || 'chrome://favicon';

    dataContainer.querySelector('.text-container-title').innerText = tab.title;
    dataContainer.querySelector('.text-container-url').innerText = tab.url;

    if (!tab.discarded && dataContainer.classList.contains('discarded-tab')) {
      dataContainer.classList.remove('discarded-tab');
    }

    if (tab.discarded) {
      dataContainer.classList.add('discarded-tab');
    }
  }

  /**
   * Reloads tab.
   * @param {number} tabId Tab identificator.
   */
  function _reloadTab(tabId) {
    if (!tabId) {
      return;
    }

    chrome.tabs.reload(tabId);
  }

  /**
   * Dicards tab. You can of course use this:
   * https://developers.google.com/web/updates/2015/09/tab-discarding
   * @param {number} tabId Tab identificator.
   */
  function _discardTab(tabId) {
    if (!chrome.tabs.discard) {
      _log('Unsupported feature (tabs.discard)!');
      return;
    }

    if (!tabId) {
      return;
    }

    isCurrentlyDiscarding = true;
    previousTabId = tabId;

    chrome.tabs.discard(tabId, function(tab) {
      if (tab.discarded) {
        let dataContainer = document.querySelector('[data-tab-id="' + tab.id + '"]');
        dataContainer.classList.add('discarded-tab');
      }
      isCurrentlyDiscarding = false;
      previousTabId = -1;
    });
  }

  /**
   * Closes tab and removes tab box.
   * @param {number} tabId Tab identificator.
   * @param {boolean} [force=false] Whether to close tab.
   */
  function _removeTab(tabId, force = false) {
    if (!tabId) {
      return;
    }

    _updateTabCounter(--tabsCounter);

    const index = listOfTabsIds.indexOf(tabId);
    listOfTabsIds.splice(index, 1);

    if (force) {
      chrome.tabs.remove(tabId);
    }

    let box = document.getElementById('box');
    box.removeChild(document.querySelector('[data-tab-id="' + tabId + '"]'));
  }

  /**
   * Adds a new container for tab information.
   * @param {Object} tab The tab object.
   * @param {Object} box The reference to div.
   */
  function _addTab(tab, box) {

    _updateTabCounter(++tabsCounter);

    listOfTabsIds.push(tab.id);

    // General data container
    let dataContainer = document.createElement('div');
    dataContainer.classList.add('data-container');
    dataContainer.setAttribute('data-tab-id', tab.id);

    // If a new tab was opened from some tab, insert new container after opener
    if (tab.openerTabId) {
      let openerContainer = document.querySelector('[data-tab-id="' + tab.openerTabId + '"]');
      // Fall back in case if something went wrong
      if (!openerContainer) {
        box.appendChild(dataContainer);
      } else {
        openerContainer.parentNode.insertBefore(dataContainer, openerContainer.nextSibling);
      }
    } else {
      box.appendChild(dataContainer);
    }

    if (tab.discarded) {
      dataContainer.classList.add('discarded-tab');
    }

    // Work on favicon
    {
      let faviconContainer = dataContainer.appendChild(document.createElement('div'));
      faviconContainer.classList.add('favicon-container');

      let faviconContainerImage = faviconContainer.appendChild(document.createElement('img'));
      faviconContainerImage.classList.add('favicon-container-image');
      faviconContainerImage.src = tab.favIconUrl || 'chrome://favicon';
      faviconContainerImage.title = 'Switch to this tab';
      faviconContainerImage.onclick = function(event) {
        chrome.tabs.update(_getTabId(this), {
          selected: true
        });
      };
    }

    // Work on text data
    {
      let textContainer = dataContainer.appendChild(document.createElement('div'));
      textContainer.classList.add('text-container');

      let textContainerTitle = textContainer.appendChild(document.createElement('span'));
      textContainerTitle.classList.add('text-container-title');
      textContainerTitle.innerText = tab.title;

      textContainer.appendChild(document.createElement('br'));

      let textContainerUrl = textContainer.appendChild(document.createElement('span'));
      textContainerUrl.classList.add('text-container-url');
      textContainerUrl.innerText = tab.url;
    }

    // Work on options container
    {
      let optionsContainer = dataContainer.appendChild(document.createElement('div'));
      optionsContainer.classList.add('options-container');

      // Closes tab
      let optionsContainerCross = optionsContainer.appendChild(document.createElement('div'));
      optionsContainerCross.innerText = unescape('%u00d7');
      optionsContainerCross.classList.add('options-container-cross');
      optionsContainerCross.title = 'Close tab';
      optionsContainerCross.onclick = function(event) {
        _removeTab(_getTabId(this), true);
      };

      // Reload tab
      let optionsContainerReload = optionsContainer.appendChild(document.createElement('div'));
      optionsContainerReload.innerText = unescape('%u2B6E');
      optionsContainerReload.classList.add('options-container-reload');
      optionsContainerReload.title = 'Reload tab';
      optionsContainerReload.onclick = function(event) {
        _reloadTab(_getTabId(this));
      };

      // Discard tab memory
      let optionsContainerDiscard = optionsContainer.appendChild(document.createElement('div'));
      optionsContainerDiscard.innerText = unescape('%u2744');
      optionsContainerDiscard.classList.add('options-container-discard');
      optionsContainerDiscard.title = 'Discard tab';
      optionsContainerDiscard.onclick = function(event) {
        _discardTab(_getTabId(this));
      };
    }
  }

  /**
   * Gets current tab identificator for container attribute.
   * @param {Object} node Node.
   * @returns {number}
   */
  function _getTabId(node) {
    let containerDiv = node.parentNode.parentNode;
    let tabId = null;
    if (containerDiv) {
      tabId = parseInt(containerDiv.getAttribute('data-tab-id'));
    }
    return tabId;
  }

  /**
   * Updates tabs counter.
   * @param {number} counter Tab counter.
   */
  function _updateTabCounter(counter) {
    let text = ' open tab';
    if (counter > 1) {
      text += 's';
    }
    let numberOfTabs = document.getElementById('number-of-tabs');
    if (!numberOfTabs) {
      return false;
    }
    numberOfTabs.innerText = counter + text;
  }

  /**
   * Updates current window ID.
   */
  function _updateCurrentWindowId() {
    // Get id of current window because we need only tabs for current one
    chrome.windows.getCurrent({}, function(window) {
      currentWindowId = window.id;
    });
  }

  /**
   * Iterates over bookmakrs and creates menus.
   *
   * Source: http://codepen.io/philhoyt/pen/ujHzd
   *
   * @param {number} bookmarkId Identificator of bookmark.
   * @param {number} parentNode Reference to the parent node.
   */
  function _iterateBookmarksAndAppendToMenu(bookmarkId, parentNode) {

    bookmarkId = bookmarkId + '';

    chrome.bookmarks.getChildren(bookmarkId, function(bookmarks) {
      if (!bookmarks.length) {
        return;
      }

      let ul = parentNode.appendChild(document.createElement('ul'));

      bookmarks.forEach(function(bookmark) {

        let li = ul.appendChild(document.createElement('li'));
        if ('1' === bookmarkId) {
          li.classList.add('bookmark-container');
        }

        // FIXME: use span instead of a?
        let link = li.appendChild(document.createElement('a'));
        link.href = '#';
        link.innerText = bookmark.title.substr(0, 24);
        if (bookmark.title.length > 24) {
          link.innerText += '...';
        }

        // This is folder, continue recursively
        if (!bookmark.url) {
          li.classList.add('folder');
          li.onmouseover = function() {
            _calculateOverflowAndFix(this.children[1]);
          };
          _iterateBookmarksAndAppendToMenu(bookmark.id, li);
          return;
        }

        // This is just link
        li.setAttribute('style', 'background-image: -webkit-image-set(' +
          'url("chrome://favicon/size/16@1x/' + bookmark.url + '") 1x, ' +
          'url("chrome://favicon/size/16@2x/' + bookmark.url + '") 2x);');
        li.classList.add('link');
        link.onclick = function(event) {
          chrome.tabs.create({
            active: false,
            url: bookmark.url
          });
        };

      }); /** bookmarks */

    }); /** getChildren */
  }

  /**
   * Loads bookmarks.
   */
  function _loadBookmarks() {

    let box = document.getElementById('box');
    box.innerHTML = '';

    let bookmarksContainer = box.appendChild(document.createElement('div'));
    bookmarksContainer.id = 'bookmarks-container';

    let menu = bookmarksContainer.appendChild(document.createElement('nav'));
    menu.id = 'bookmarks-menu';

    _iterateBookmarksAndAppendToMenu('1', menu);
  }

  /**
   * Check if element overflows window width and fix it.
   * @param {Object} node Node.
   */
  function _calculateOverflowAndFix(node) {
    if (!node) {
      return;
    }
    let dimensions = node.getBoundingClientRect();
    if (dimensions.left + dimensions.width > window.innerWidth) {
      let parentDimensions = node.parentNode.getBoundingClientRect();
      if (node.parentNode.classList.contains('bookmark-container')) {
        node.setAttribute('style', 'left: -' + (dimensions.width - parentDimensions.width) + 'px');
      } else {
        node.setAttribute('style', 'left: -' + dimensions.width + 'px');
      }
    }
  }

  /**
   * Creates list of tabs.
   */
  function _makeListOfTabs() {

    let currentTabId = null;
    chrome.tabs.getCurrent(function(tab) {
      currentTabId = tab.id;
    });

    chrome.tabs.query({
      url: '<all_urls>'
    }, function(tabs) {

      let windowsArray = {};
      tabs.forEach(function(tab) {

        // Filter out other windows
        if (currentWindowId !== tab.windowId && !doShowAllWindows) {
          return;
        }

        if (false === tab.windowId in windowsArray) {
          windowsArray[tab.windowId] = [];
        }

        // Dont show this tab
        if (tab.id === currentTabId) {
          return;
        }

        windowsArray[tab.windowId].push(tab);
      });

      let box = document.getElementById('box');

      Object.keys(windowsArray).forEach(function(windowId) {

        if (doShowAllWindows) {
          let separator = box.appendChild(document.createElement('div'));
          separator.classList.add('separator');
          separator.innerText = 'Window (ID ' + windowId + ')';
        }

        let tabs = windowsArray[windowId];
        tabs.forEach(function(tab) {
          try {
            _addTab(tab, box);
          } catch (e) {
            // Should never happen
            console.error(e);
          }
        });
      });
    });

    _updateTabCounter(tabsCounter);
  }

  /**
   * Triggers on window.onload event.
   */
  function onload() {

    _log('onload event');

    doShowAllWindows = false;
    tabsCounter = 1;
    currentWindowId = null;
    listOfTabsIds = [];

    document.getElementById('footer-help').onclick = function(event) {
      event.preventDefault();
      document.getElementById('help').classList.remove('hidden');
    };
    document.querySelector('#help-close').onclick = function(event) {
      document.getElementById('help').classList.add('hidden');
    };

    _updateCurrentWindowId();

    chrome.storage.sync.get({
      showBookmarks: false,
      showAllWindows: false,
      allowDebugLogs: false,
    }, function(items) {

      if (items.showBookmarks) {
        _loadBookmarks();
      }

      if (items.showAllWindows) {
        doShowAllWindows = true;
      }

      if (items.allowDebugLogs) {
        isDebugMode = true;
      }

      _makeListOfTabs();
    });
  }

  /**
   * Triggers on chrome.tabs.onRemoved event.
   * @param {number} tabId Tab identificator.
   */
  function onRemoved(tabId) {

    _log('global onRemoved ' + tabId);

    if (false === listOfTabsIds.includes(tabId) && !doShowAllWindows) {
      return;
    }

    _log('local onRemoved ' + tabId);

    _removeTab(tabId);
  }

  /**
   * Triggers on chrome.tabs.onDetached event.
   * @param {number} tabId Tab identificator.
   */
  function onDetached(tabId) {

    _log('global onDetached ' + tabId);

    chrome.tabs.getCurrent(function(tab) {
      if (tab.id === tabId) {
        _log('Detached current tab');
        onload();
      }
    });

    if (false === listOfTabsIds.includes(tabId) && !doShowAllWindows) {
      return;
    }

    _log('local onDetached ' + tabId);

    _removeTab(tabId);
  }

  /**
   * Triggers on chrome.tabs.onAttached event.
   * @param {Object} tab The tab object.
   */
  function onAttached(tab) {

    _log('global onAttached ' + tab.id);

    _updateCurrentWindowId();

    // Filter out other windows
    if (currentWindowId !== tab.windowId) {
      if ('undefined' === typeof tab.id) {
        _log('Foreign tab attached, need to refresh layout');
        //window.dispatchEvent(new Event('load'));
        onload();
      }
      if (!doShowAllWindows) {
        return;
      }
    }

    _log('local onAttached ' + tab.id);

    let box = document.getElementById('box');

    _addTab(tab, box);
  }

  /**
   * Triggers on chrome.tabs.onCreated event.
   * @param {Object} tab The tab object.
   */
  function onCreated(tab) {

    _log('global onCreated ' + tab.id);

    // Filter out other windows
    if (currentWindowId !== tab.windowId && !doShowAllWindows) {
      return;
    }

    _log('local onCreated ' + tab.id);

    let box = document.getElementById('box');

    _addTab(tab, box);
  }

  /**
   * Triggers on chrome.tabs.onUpdated event.
   * @param {number} tabId Tab identificator.
   * @param {Object} changeInfo The info about changes.
   * @param {Object} tab The tab object.
   */
  function onUpdated(tabId, changeInfo, tab) {

    _log('global onUpdated ' + tabId);

    // Filter out other windows
    if (currentWindowId !== tab.windowId && !doShowAllWindows) {
      return;
    }

    _log('local onUpdated ' + tab.id);

    _updateTab(tab);
  }

  /**
   * Triggers on chrome.tabs.onMoved event.
   * @param {number} tabId Tab identificator.
   * @param {Object} moveInfo The info about changes.
   */
  function onMoved(tabId, moveInfo) {
    _log('global onMoved ' + tabId);

    // Filter out other windows
    if (currentWindowId !== moveInfo.windowId && !doShowAllWindows) {
      return;
    }

    _log('local onMoved ' + tabId);

    // Simply refresh layout, user wont see it as he is moving tabs.
    onload();
  }

  return {
    onload: onload,

    onRemoved: onRemoved,
    onDetached: onDetached,
    onAttached: onAttached,
    onCreated: onCreated,
    onUpdated: onUpdated,
    onMoved: onMoved
  };
}();


chrome.tabs.onRemoved.addListener(tl.onRemoved);
chrome.tabs.onDetached.addListener(tl.onDetached);
chrome.tabs.onAttached.addListener(tl.onAttached);
chrome.tabs.onCreated.addListener(tl.onCreated);
chrome.tabs.onUpdated.addListener(tl.onUpdated);
chrome.tabs.onMoved.addListener(tl.onMoved);

window.onload = tl.onload;
