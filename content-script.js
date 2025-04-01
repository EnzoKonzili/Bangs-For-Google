// Get the list of bangs
let bangs = [];

// Fetch bangs from background page
chrome.runtime.sendMessage({ action: "getBangs" }, response => {
  if (response && response.bangs) {
    bangs = response.bangs;
    processSearch();
  }
});

function processSearch() {
  // Get the current URL
  const url = new URL(window.location.href);
  const query = url.searchParams.get('q');

  // Check if query has a bang anywhere in it
  if (query && query.includes('!')) {
    for (let bang of bangs) {
      const bangStartIdx = query.indexOf(`!${bang.t}`);
      const prevCharIdx = bangStartIdx - 1;
      const nextCharIdx = bangStartIdx + bang.t.length + 1;
      
      if (bangStartIdx > -1 && 
          (nextCharIdx === query.length || query[nextCharIdx] === ' ') && 
          (prevCharIdx === -1 || query[prevCharIdx] === ' ')) {
        
        // Redirect to DuckDuckGo with the bang
        window.location.href = `https://www.duckduckgo.com/?q=${encodeURIComponent(query)}`;
        break;
      }
    }
  }
}