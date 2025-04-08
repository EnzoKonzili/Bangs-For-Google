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
  try {
    chrome.omnibox.setDefaultSuggestion({
      description: `Search DuckDuckGo with bang: <match>${text}</match>`
    });
  } catch (err) {
    console.error("Error setting default suggestion:", err);
  }

  // Skip processing if query is empty
  if (filterText.length === 0) {
    return;
  }

  // Categorize matches by type for better sorting
  const exactMatches = [];
  const prefixMatches = [];
  const partialMatches = [];
  
  // For case-insensitive comparison
  const lowerFilter = filterText.toLowerCase();
  
  // First pass - categorize matches by type
  for (const bang of bangs) {
    // For case-insensitive matching
    const bangTrigger = bang.t.toLowerCase();
    const bangSite = bang.s.toLowerCase();
    
    // Exact match of the trigger (highest priority)
    if (bangTrigger === lowerFilter) {
      exactMatches.push({
        content: `!${bang.t}`,
        description: `<match>!${bang.t}</match> <dim>(${bang.s})</dim>`,
        score: 1000 + (bang.r || 0)
      });
    } 
    // Bang trigger starts with the filter text
    else if (bangTrigger.startsWith(lowerFilter)) {
      prefixMatches.push({
        content: `!${bang.t}`,
        description: `<match>!${bang.t}</match> <dim>(${bang.s})</dim>`,
        score: 800 + (bang.r || 0) - (bang.t.length * 5) // Shorter bangs score higher
      });
    }
    // Site name contains the filter text
    else if (bangSite.includes(lowerFilter)) {
      partialMatches.push({
        content: `!${bang.t}`,
        description: `<match>!${bang.t}</match> <dim>(${bang.s})</dim>`,
        score: 500 + (bang.r || 0)
      });
    }
  }
  
  // If we have an exact match, set it as the default suggestion
  if (exactMatches.length > 0) {
    // Sort exact matches by their DuckDuckGo relevance
    exactMatches.sort((a, b) => b.score - a.score);
    const bestExactMatch = exactMatches[0];
    
    try {
      // Update the default suggestion with the best exact match
      chrome.omnibox.setDefaultSuggestion({
        description: bestExactMatch.description
      });
    } catch (err) {
      console.error("Error setting exact match default suggestion:", err);
    }
  }
  
  // Combine and sort all matches
  const allMatches = [
    ...exactMatches,
    ...prefixMatches.sort((a, b) => b.score - a.score),
    ...partialMatches.sort((a, b) => b.score - a.score)
  ];
  
  // Remove the best exact match if it exists (already shown as default)
  const suggestionsToShow = exactMatches.length > 0 
    ? allMatches.slice(1, 6)  // Skip the first one which is the default suggestion
    : allMatches.slice(0, 5); // Show top 5
  
  // Prepare final suggestions
  const finalSuggestions = suggestionsToShow.map(match => ({
    content: match.content,
    description: match.description
  }));
  
  console.log(`Sending ${finalSuggestions.length} suggestions`);
  
  // Send suggestions to Chrome - try handling potential errors
  try {
    suggest(finalSuggestions);
  } catch (error) {
    console.error("Error providing suggestions:", error);
    
    // Try with simpler formatting if the rich formatting failed
    try {
      const simpleSuggestions = finalSuggestions.map(s => ({
        content: s.content,
        description: s.content
      }));
      suggest(simpleSuggestions);
    } catch (fallbackError) {
      console.error("Even simplified suggestions failed:", fallbackError);
    }
  }
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  let bang = text.trim();
  if (bang.indexOf("!") === 0) {
    bang = bang.substr(1);
  }

  const url = `https://www.duckduckgo.com/?q=${encodeURIComponent(`!${bang}`)}`;

  try {
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
      default:
        chrome.tabs.update({ url });
    }
  } catch (err) {
    console.error("Error handling navigation:", err);
    // Fallback to simple tab creation if there was an error
    chrome.tabs.create({ url });
  }
});