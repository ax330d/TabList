// TabList
// Developed by Arthur (ax330d) Gerkis
//
// TODO: show thumbnails
// TODO: show screenshots?
// TODO: show bookmarks
// TODO: drag n drop
// TODO: watch events and synchronize tabs opened/closed
// TODO: list all (all windows, by categories, if user wants) open tabs

function htmlEntities(str) {
    return String(str).
        replace(/&/g, '&amp;').
        replace(/</g, '&lt;').
        replace(/>/g, '&gt;').
        replace(/"/g, '&quot;');
}

function addNewContainer(tab, box) {
    // General data container
    var newDiv = document.createElement('div');
    newDiv.id = 'data-container';
    // Required to remove div on-the-fly, w/o reloading page
    newDiv.setAttribute('data-id', tab.id);
    box.appendChild(newDiv);

    // Container for favicons
    var faviconDiv = document.createElement('div');
    var faviconImage = document.createElement('img');
    faviconImage.id = 'favicon-image';
    // More optimised way would be to use chrome://favicon/ + url, but
    // it does not hold high-resolution images. However, Chrome should
    // cache favicons anyway.
    // FIXME: how bad is this?
    faviconImage.src = tab.favIconUrl;
    if (!tab.favIconUrl) {
        faviconImage.src = 'chrome://favicon/';
    }

    faviconDiv.onclick = function() {
        try {
            chrome.tabs.update(tab.id, {selected: true});
        } catch(e) {
            // Currently try-catch as we dont watch events
            console.error(e);
        }

    };

    faviconDiv.appendChild(faviconImage);
    faviconDiv.id = "favicon-div";
    newDiv.appendChild(faviconDiv);

    // Container for URLs
    var urlDiv = document.createElement('div');
    urlDiv.innerHTML = '<span id="title">' + htmlEntities(tab.title) +
                       '</span><br />' + htmlEntities(tab.url);
    urlDiv.id = "url-div";
    newDiv.appendChild(urlDiv);

    // FIXME: fix position of cross
    var optionsDiv = document.createElement('div');
    optionsDiv.id = "options-div";
    var spanCross = document.createElement('span');
    spanCross.innerText = '×';
    spanCross.id = 'cross';
    spanCross.onclick = function(event) {
        try {
            chrome.tabs.remove(tab.id);
            box.removeChild(document.querySelector('[data-id="' + tab.id + '"]'));
        } catch(e) {
            // Currently try-catch as we dont watch events
            console.error(e);
        }

    };
    optionsDiv.appendChild(spanCross);
    newDiv.appendChild(optionsDiv);
}

window.onload = function()
{
    // Get id of current window because we need only tabs for current one
    var currentID = null;
    chrome.windows.getCurrent({}, function(window) {
        currentID = window.id;
    });

    var counter = 0;
    var box = document.getElementById('box');
    var currentTabID = 0;

    chrome.tabs.getCurrent(function(tab) {
        currentTabID = tab.id;
    });

    chrome.tabs.query({url: '<all_urls>'}, function(tabs)
    {
        // Iterate over tabs
        tabs.forEach(function(tab)
        {
            // Filter out other windows
            if (currentID !== tab.windowId) {
                return;
            }

            // Dont show this tab
            if (tab.id === currentTabID) {
                return;
            }

            counter += 1;

            try {
                addNewContainer(tab, box);
            } catch(e) {
                // Should never happen
            }
        });

        document.getElementById('number-of-tabs').innerText = counter;
    });
};
