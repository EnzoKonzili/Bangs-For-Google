let bangs = [];

// Ensure the service worker stays active to handle omnibox events
chrome.runtime.onStartup.addListener(() => {
  console.log("Extension started");
});

// Keep the service worker alive
const keepAlive = () => setInterval(() => {
  console.log("Keeping service worker alive");
}, 20000);

// Start the keep-alive interval when the service worker starts
keepAlive();

// Get current list of Bangs from DuckDuckGo
async function updateBangs() {
  try {
    console.log("Fetching bangs from DuckDuckGo");
    const res = await fetch("https://duckduckgo.com/bang.js");
    const fetchedBangs = await res.json();
    
    if (fetchedBangs && fetchedBangs.length > 0) {
      console.log(`Successfully loaded ${fetchedBangs.length} bangs`);
      bangs = fetchedBangs;
      // Store in storage for persistence
      chrome.storage.local.set({ bangs: fetchedBangs });
    } else {
      console.error("Loaded bangs array was empty");
      // Try loading from local storage as fallback
      loadBangsFromStorage();
    }
  } catch (error) {
    console.error('Failed to fetch bangs:', error);
    // Try loading from local storage as fallback
    loadBangsFromStorage();
  }
}

// Load bangs from local storage
async function loadBangsFromStorage() {
  try {
    const data = await chrome.storage.local.get(['bangs']);
    if (data.bangs && data.bangs.length > 0) {
      console.log(`Loaded ${data.bangs.length} bangs from storage`);
      bangs = data.bangs;
    }
  } catch (error) {
    console.error('Failed to load bangs from storage:', error);
  }
}

// Initial fetch of bangs
updateBangs();

// Refresh bangs periodically
chrome.alarms.create('updateBangs', { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateBangs') {
    updateBangs();
  }
});

// Set default suggestion when extension is loaded
chrome.omnibox.setDefaultSuggestion({
  description: 'Type a DuckDuckGo bang (e.g., "yt" for YouTube)'
});

// Handle message requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getBangs") {
    sendResponse({ bangs: bangs });
  }
  return true;  // Indicates we want to use sendResponse asynchronously
});

// Debug function to show current state
function debugState(text) {
  console.log(`Debug [${text}]: ${bangs.length} bangs loaded`);
}

// Omnibox input started - triggered when the user types our keyword
chrome.omnibox.onInputStarted.addListener(() => {
  debugState("onInputStarted");
  
  // Make sure we have bangs loaded
  if (bangs.length === 0) {
    loadBangsFromStorage();
    updateBangs();
  }
});

// Omnibox Auto-Complete
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  debugState(`onInputChanged: ${text}`);
  
  if (bangs.length === 0) {
    console.log("Warning: No bangs loaded for suggestions");
  }
  
  let filterText = text.trim();
  if (filterText.indexOf("!") === 0) {
    filterText = filterText.substr(1);
  }
  
  // Set a simple default suggestion first
  chrome.omnibox.setDefaultSuggestion({
    description: `Search DuckDuckGo with bang: <match>${text}</match>`
  });

  // Build suggestions for matching bangs
  const suggestions = [];
  
  for (const bang of bangs) {
    if (
      bang.t.startsWith(filterText) ||
      bang.s.toLowerCase().includes(filterText.toLowerCase())
    ) {
      const relevance = bang.t === filterText ? 1000 : 
                        bang.t.startsWith(filterText) ? 900 - bang.t.length :
                        700;
                        
      suggestions.push({
        content: `!${bang.t}`,
        description: `<match>!${bang.t}</match> <dim>(${bang.s})</dim>`,
        deletable: false
      });
    }
  }
  
  // Only send top 5 most relevant suggestions
  const topSuggestions = suggestions
    .slice(0, 5)
    .sort((a, b) => {
      // Sort by length (shorter is better)
      return a.content.length - b.content.length;
    });
  
  console.log(`Sending ${topSuggestions.length} suggestions`);
  suggest(topSuggestions);
  
  // Update default suggestion if we found an exact match
  if (topSuggestions.length > 0) {
    const exactMatch = topSuggestions.find(s => s.content === `!${filterText}`);
    if (exactMatch) {
      chrome.omnibox.setDefaultSuggestion({
        description: exactMatch.description
      });
    }
  }
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  let bang = text.trim();
  if (bang.indexOf("!") === 0) {
    bang = bang.substr(1);
  }

  const url = `https://www.duckduckgo.com/?q=${encodeURIComponent(`!${bang}`)}`;

  switch (disposition) {
    case "currentTab":
      chrome.tabs.update({ url });
      break;
    case "newForegroundTab":
      chrome.tabs.create({ url });
      break;
    case "newBackgroundTab":
      chrome.tabs.create({ url, active: false });
      break;
  }
});