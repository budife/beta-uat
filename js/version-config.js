/**
 * Version Configuration System
 * Manages application version and build information
 */

// Generate build number
function generateBuildNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}${time}`;
}

// Version Configuration
// \u26a0\ufe0f UBAH BAGIAN INI SAAT UPDATE VERSI MANUAL \u26a0\ufe0f
const VERSION_CONFIG = {
  version: '4.6.0',                    // ← GANTI VERSI DI SINI (contoh: '1.2.0', '2.0.0')
  buildDate: new Date().toISOString(),        // ← OTOMATIS, tidak perlu diganti
  buildNumber: generateBuildNumber(),           // ← OTOMATIS, tidak perlu diganti
  environment: 'development',                 // ← GANTI JIKA PERLU (production/development)
  appName: 'eDM Helper',                   // ← GANTI JIKA PERLU
  author: '@budife.psd'                     // ← GANTI JIKA PERLU
};

// Auto-update version system
// \u26a0\ufe0f UBAH BAGIAN INI UNTUK KONTROL AUTO-UPDATE \u26a0\ufe0f
let AUTO_UPDATE_ENABLED = false;                 // ← GANTI JIKA INI MATIKAN AUTO-UPDATE (true/false)
let AUTO_UPDATE_INTERVAL = 60000;              // ← GANTI INTERVAL AUTO-UPDATE (ms) - 60000 = 1 menit

// Auto-increment version function
function incrementVersion(patchIncrement = 1) {
  const currentVersion = VERSION_CONFIG.version.split('.');
  let [major, minor, patch] = currentVersion.map(Number);
  
  if (patchIncrement !== undefined) {
    patch += patchIncrement;
  } else if (minor !== undefined) {
    minor += 1;
    patch = 0;
  } else {
    major += 1;
    minor = 0;
    patch = 0;
  }
  
  return `${major}.${minor}.${patch}`;
}

// Auto-update version on build
function autoUpdateVersion() {
  if (!AUTO_UPDATE_ENABLED) return;
  
  const newVersion = incrementVersion(1);
  VERSION_CONFIG.version = newVersion;
  VERSION_CONFIG.buildDate = new Date().toISOString();
  VERSION_CONFIG.buildNumber = generateBuildNumber();
  
  updateAllVersionDisplays();
  console.log(`\ud83d\udd04 Auto-updated to v${newVersion} at ${new Date().toLocaleTimeString()}`);
}

// Start auto-update system
function startAutoUpdate() {
  if (AUTO_UPDATE_ENABLED && !window.autoUpdateInterval) {
    window.autoUpdateInterval = setInterval(autoUpdateVersion, AUTO_UPDATE_INTERVAL);
    console.log('\ud83d\udd04 Auto-update system started (every 1 minute)');
  }
}

// Stop auto-update system
function stopAutoUpdate() {
  if (window.autoUpdateInterval) {
    clearInterval(window.autoUpdateInterval);
    window.autoUpdateInterval = null;
    AUTO_UPDATE_ENABLED = false;
    console.log('\u23f9\ufe0f Auto-update system stopped');
  }
}

// Toggle auto-update
function toggleAutoUpdate() {
  if (AUTO_UPDATE_ENABLED) {
    stopAutoUpdate();
  } else {
    startAutoUpdate();
  }
  return AUTO_UPDATE_ENABLED;
}

// Get auto-update status
function getAutoUpdateStatus() {
  return {
    enabled: AUTO_UPDATE_ENABLED,
    interval: AUTO_UPDATE_INTERVAL,
    nextUpdate: window.autoUpdateInterval ? 
      new Date(Date.now() + AUTO_UPDATE_INTERVAL).toLocaleTimeString() : null
  };
}
// Get current version information
function getVersionInfo() {
  return {
    ...VERSION_CONFIG,
    currentYear: new Date().getFullYear(),
    formattedBuildDate: formatDate(VERSION_CONFIG.buildDate),
    autoUpdate: getAutoUpdateStatus()
  };
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  return date.toLocaleDateString('en-US', options);
}

// Update footer with dynamic version
function updateFooterVersion() {
  const versionInfo = getVersionInfo();
  const footerText = document.querySelector('.footer-text');
  const yearElement = document.getElementById('footer-year');
  
  // Update year
  if (yearElement) {
    yearElement.textContent = versionInfo.currentYear;
  }
  
  // Update footer text
  if (footerText) {
    footerText.innerHTML = 
      `© ${versionInfo.currentYear} ${versionInfo.appName} <span class="footer-version" data-version>v${versionInfo.version}</span>. ` +
      `crafted with <i class="fa-solid fa-heart"></i>`;
  }
}

// Update all version displays in the page
function updateAllVersionDisplays() {
  const versionInfo = getVersionInfo();
  
  // Update footer
  updateFooterVersion();
  
  // Update any other version displays
  const versionElements = document.querySelectorAll('[data-version]');
  versionElements.forEach(element => {
    element.textContent = `v${versionInfo.version}`;
  });
  
  // Update build date displays
  const buildDateElements = document.querySelectorAll('[data-build-date]');
  buildDateElements.forEach(element => {
    element.textContent = versionInfo.formattedBuildDate;
  });
}

// Get version for console/debug
function getAppVersion() {
  return VERSION_CONFIG.version;
}

// Get build information
function getBuildInfo() {
  return {
    version: VERSION_CONFIG.version,
    buildDate: VERSION_CONFIG.buildDate,
    buildNumber: VERSION_CONFIG.buildNumber,
    environment: VERSION_CONFIG.environment
  };
}

// Initialize version system when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  updateAllVersionDisplays();
  
  // Start auto-update system if enabled
  if (AUTO_UPDATE_ENABLED) {
    startAutoUpdate();
  }
  
  // Log version info to console for debugging
  // console.log(`🚀 ${VERSION_CONFIG.appName} v${VERSION_CONFIG.version}`);
  // console.log('📅 Build Date:', VERSION_CONFIG.buildDate);
  // console.log('🔢 Build Number:', VERSION_CONFIG.buildNumber);
  // console.log('🌍 Environment:', VERSION_CONFIG.environment);
  // console.log('🔄 Auto-Update:', AUTO_UPDATE_ENABLED ? 'ENABLED' : 'DISABLED');
});

// Global function for manual version update
window.updateVersion = function(newVersion, buildDate = null, disableAutoUpdate = false) {
  VERSION_CONFIG.version = newVersion;
  if (buildDate) {
    VERSION_CONFIG.buildDate = buildDate;
  }
  VERSION_CONFIG.buildNumber = generateBuildNumber();
  
  // Disable auto-update if requested
  if (disableAutoUpdate) {
    stopAutoUpdate();
  }
  
  updateAllVersionDisplays();
  console.log(`\ud83d\udd04 Version updated to v${newVersion}`);
};

// Global functions for auto-update control
window.startAutoUpdate = startAutoUpdate;
window.stopAutoUpdate = stopAutoUpdate;
window.toggleAutoUpdate = toggleAutoUpdate;
window.getAutoUpdateStatus = getAutoUpdateStatus;
window.autoUpdateVersion = autoUpdateVersion;
