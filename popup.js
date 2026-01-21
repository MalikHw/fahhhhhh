document.addEventListener('DOMContentLoaded', function() {
  loadStats();

  document.getElementById('spinBtn').addEventListener('click', function() {
    chrome.runtime.sendMessage({action: 'spinRoulette'});
  });

  document.getElementById('resetBtn').addEventListener('click', function() {
    if (confirm('Reset all stats?')) {
      chrome.storage.local.set({
        totalKilled: 0,
        totalSpins: 0,
        victims: []
      }, loadStats);
    }
  });
});

function loadStats() {
  chrome.storage.local.get(['totalKilled', 'totalSpins', 'victims'], function(data) {
    document.getElementById('totalKilled').textContent = data.totalKilled || 0;
    document.getElementById('totalSpins').textContent = data.totalSpins || 0;
    
    const victimsList = document.getElementById('victims');
    const victims = data.victims || [];
    
    if (victims.length > 0) {
      victimsList.innerHTML = '<strong>Recent Victims:</strong><br>' + 
        victims.slice(-10).reverse().map(v => 
          `<div class="victim-item">☠️ ${v}</div>`
        ).join('');
    } else {
      victimsList.innerHTML = '<em>No tabs have been sacrificed yet...</em>';
    }
  });
}

// Listen for stats updates
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'statsUpdated') {
    loadStats();
  }
});

<!-- background.js -->
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'spinRoulette') {
    spinTheWheel();
  }
});

async function spinTheWheel() {
  const tabs = await chrome.tabs.query({});
  
  if (tabs.length <= 1) {
    return; // Don't close the last tab
  }

  // Increment total spins
  const data = await chrome.storage.local.get(['totalSpins', 'totalKilled', 'victims']);
  const totalSpins = (data.totalSpins || 0) + 1;
  await chrome.storage.local.set({totalSpins});

  // Pick random tab
  const randomIndex = Math.floor(Math.random() * tabs.length);
  const victimTab = tabs[randomIndex];
  
  // Create notification tab with countdown
  const warningTab = await chrome.tabs.create({
    url: chrome.runtime.getURL('warning.html'),
    active: true
  });

  // Send victim info to warning page
  setTimeout(() => {
    chrome.tabs.sendMessage(warningTab.id, {
      action: 'startCountdown',
      victim: {
        title: victimTab.title,
        url: victimTab.url,
        id: victimTab.id
      }
    });
  }, 100);
}

chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
  if (request.action === 'executeKill') {
    const data = await chrome.storage.local.get(['totalKilled', 'victims']);
    const totalKilled = (data.totalKilled || 0) + 1;
    const victims = data.victims || [];
    
    // Add to victims list
    const domain = new URL(request.victimUrl).hostname;
    victims.push(domain);
    
    await chrome.storage.local.set({totalKilled, victims});
    
    // Close the victim tab
    chrome.tabs.remove(request.victimId);
    
    // Notify popup to update stats
    chrome.runtime.sendMessage({action: 'statsUpdated'});
  }
});
