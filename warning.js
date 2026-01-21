let countdown = 3;
let victimInfo = null;
let countdownInterval = null;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'startCountdown') {
    victimInfo = request.victim;
    document.getElementById('victimTitle').textContent = victimInfo.title;
    document.getElementById('victimUrl').textContent = victimInfo.url;
    
    countdownInterval = setInterval(updateCountdown, 1000);
  }
});

function updateCountdown() {
  countdown--;
  document.getElementById('countdown').textContent = countdown;
  
  if (countdown <= 0) {
    clearInterval(countdownInterval);
    executeKill();
  }
}

function executeKill() {
  chrome.runtime.sendMessage({
    action: 'executeKill',
    victimId: victimInfo.id,
    victimUrl: victimInfo.url
  }, function() {
    window.close();
  });
}

document.getElementById('cancelBtn').addEventListener('click', function() {
  clearInterval(countdownInterval);
  window.close();
});
