<p align="center">
    <img src="icons/icon-500.png" height="300"><br />
    <!-- <a href="https://addons.mozilla.org/en-US/firefox/addon/bangs-for-google/">
        <img src="icons/firefox.png" alt="Available on Firefox Add-Ons" width="150">
    </a>
    <a href="https://chrome.google.com/webstore/detail/bangs-for-google/emidbfgmfdphfdldbmehojiocmljfonj">
        <img src="icons/chrome.png" alt="Available on chrome web store" width="150">
    </a> -->
</p>

# Bangs for Google

Automatically use DuckDuckGo for [Bangs](https://duckduckgo.com/bang), keeping Google for all other searches.

## Features

- **Bang Redirects**: Automatically redirects Google searches that begin with a bang (e.g., "!yt cats") to DuckDuckGo
- **Advanced Bang Detection**: Also detects bangs anywhere in your search query, surrounded by spaces
- **Bang Autocomplete**: Type "!" followed by a space in your address bar to activate autocomplete for all DuckDuckGo bangs
- **Performance Optimized**: Uses Chrome's declarativeNetRequest API for efficient redirects
- **Up-to-Date Bangs**: Regularly updates from DuckDuckGo's bang database

## Installation
The original "Bangs for Google" is available through the [Firefox Add-On Platform](https://addons.mozilla.org/en-US/firefox/addon/bangs-for-google/) and [chrome web store](https://chrome.google.com/webstore/detail/bangs-for-google/emidbfgmfdphfdldbmehojiocmljfonj).

### Installing from source
If you prefer to install the latest version directly from the source code:

1. Download or clone this repository to your computer
2. Open Chrome (or any other chrome based browser) and navigate to `chrome://extensions` or `<your_browser>://extensions`
3. Enable "Developer mode" by toggling the switch in the top right corner
4. Click the "Load unpacked" button
5. Select the folder containing the extension files (the folder with manifest.json)
6. The extension should now be installed and ready to use

This method allows you to use the extension before it's available on the Chrome Web Store or to test your own modifications.

## How does it work? How is the performance?

"Bangs for Google" uses Chrome's `declarativeNetRequest` API and content scripts to efficiently handle bang redirects. The extension monitors your Google Search queries and:

1. For simple cases (bang at beginning of query), it uses declarative rules for instant redirects
2. For complex cases (bangs anywhere in query), it uses a content script for detection

This hybrid approach ensures both performance and flexibility. Since the extension uses modern Chrome APIs, redirects to DuckDuckGo happen very quickly without impacting browser performance.

## Usage

- **Direct Bang Searches**: Type "!bang search" in Google to be redirected to DuckDuckGo
- **Address Bar Bangs**: Type "!" followed by a space in your address bar, then start typing to see bang suggestions
- **Bang Suggestions**: After activating the extension with "! " in your address bar, you'll see matching bang suggestions as you type

## Contributing
Please fork this repository and create a new pull request to contribute to it.

If you notice any errors, please create a new issue on GitHub.

## Technical Details
This extension is built using Manifest V3 and modern Chrome Extension APIs, making it compatible with the latest browser requirements.

# License
The extension is licensed under the MIT License.