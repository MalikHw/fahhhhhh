document.addEventListener('DOMContentLoaded', function() {
  loadStats();

  document.getElementById('spinBtn').addEventListener('click', function() {
    browser.runtime.sendMessage({action: 'spinRoulette'});
  });

  document.getElementById('resetBtn').addEventListener('click', function() {
    if (confirm('Reset all stats?')) {
      browser.storage.local.set({
        totalKilled: 0,
        totalSpins: 0,
        victims: []
      }, loadStats);
    }
  });
});

function loadStats() {
  browser.storage.local.get(['totalKilled', 'totalSpins', 'victims'], function(data) {
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
browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'statsUpdated') {
    loadStats();
  }
});

<!-- background.js -->
browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'spinRoulette') {
    spinTheWheel();
  }
});

async function spinTheWheel() {
  const tabs = await browser.tabs.query({});
  
  if (tabs.length <= 1) {
    return; // Don't close the last tab
  }

  // Increment total spins
  const data = await browser.storage.local.get(['totalSpins', 'totalKilled', 'victims']);
  const totalSpins = (data.totalSpins || 0) + 1;
  await browser.storage.local.set({totalSpins});

  // Pick random tab
  const randomIndex = Math.floor(Math.random() * tabs.length);
  const victimTab = tabs[randomIndex];
  
  // Create notification tab with countdown
  const warningTab = await browser.tabs.create({
    url: browser.runtime.getURL('warning.html'),
    active: true
  });

  // Send victim info to warning page
  setTimeout(() => {
    browser.tabs.sendMessage(warningTab.id, {
      action: 'startCountdown',
      victim: {
        title: victimTab.title,
        url: victimTab.url,
        id: victimTab.id
      }
    });
  }, 100);
}

browser.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
  if (request.action === 'executeKill') {
    const data = await browser.storage.local.get(['totalKilled', 'victims']);
    const totalKilled = (data.totalKilled || 0) + 1;
    const victims = data.victims || [];
    
    // Add to victims list
    const domain = new URL(request.victimUrl).hostname;
    victims.push(domain);
    
    await browser.storage.local.set({totalKilled, victims});
    
    // Close the victim tab
    browser.tabs.remove(request.victimId);
    
    // Notify popup to update stats
    browser.runtime.sendMessage({action: 'statsUpdated'});
  }
});
