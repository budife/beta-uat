/* ===================================
   TOAST UTILITY - Merged from toast.js
   =================================== */

/* ===================================
   SHARED TOAST UTILITY
   =================================== */

// Global Toast Manager Class
class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }
  
  init() {
    // Create toast container if it doesn't exist
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
      `;
      // Append to layout area
      const layoutArea = document.querySelector('main.layout');
      if (layoutArea) {
        layoutArea.appendChild(this.container);
      } else {
        // Fallback to body
        document.body.appendChild(this.container);
      }
    } else {
      this.container = document.getElementById('toast-container');
    }
  }
  
  show(message, type = 'info', options = {}) {
    const {
      duration = 3000,
      position = 'top-right'
    } = options;
    
    // Update container position
    this.updatePosition(position);
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : type === 'warning' ? '#eab308' : '#3b82f6'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      margin-bottom: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      pointer-events: auto;
      cursor: pointer;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 300px;
      word-wrap: break-word;
    `;
    toast.textContent = message;
    
    this.container.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
    });
    
    // Remove on click
    toast.addEventListener('click', () => {
      this.remove(toast);
    });
    
    // Auto remove
    setTimeout(() => {
      this.remove(toast);
    }, duration);
  }
  
  updatePosition(position) {
    const positions = {
      'top-right': 'top: 80px; right: 20px;',
      'top-left': 'top: 80px; left: 20px;',
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;'
    };
    
    this.container.style.cssText = `
      position: fixed;
      z-index: 10000;
      pointer-events: none;
      ${positions[position] || positions['top-right']}
    `;
  }
  
  remove(toast) {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
  
  success(message, options = {}) {
    this.show(message, 'success', options);
  }
  
  error(message, options = {}) {
    this.show(message, 'error', options);
  }
  
  warning(message, options = {}) {
    this.show(message, 'warning', options);
  }
  
  info(message, options = {}) {
    this.show(message, 'info', options);
  }
}

// Shared showToast function
function showToast(message, type = 'info', title = '') {
  // Use global toast system if available
  if (type === 'success' && window.toastSuccess) {
    window.toastSuccess(message, title);
    return;
  } else if (type === 'error' && window.toastError) {
    window.toastError(message, title);
    return;
  } else if (type === 'warning' && window.toastWarning) {
    window.toastWarning(message, title);
    return;
  } else if (window.toastInfo) {
    window.toastInfo(message, title);
    return;
  }
  
  // Fallback - create simple toast
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    color: white;
    padding: 12px 20px;
    border-radius: 5px;
    z-index: 10000;
    font-size: 14px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => toast.style.opacity = '1', 100);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Initialize global toast manager
window.toastManager = new ToastManager();

// Global toast functions for compatibility
window.toastSuccess = function(message, title = '') {
  if (window.toastManager) {
    window.toastManager.success(message);
  }
};

window.toastError = function(message, title = '') {
  if (window.toastManager) {
    window.toastManager.error(message);
  }
};

window.toastWarning = function(message, title = '') {
  if (window.toastManager) {
    window.toastManager.warning(message);
  }
};

window.toastInfo = function(message, title = '') {
  if (window.toastManager) {
    window.toastManager.info(message);
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ToastManager, showToast };
}


// Initialize Toast Manager
document.addEventListener('DOMContentLoaded', () => {
  window.toastManager = new ToastManager();
});

/* ===================================
   ORIGINAL CODE
   =================================== */


// ---- Extracted scripts from inline <script> blocks ----
// Initialize CodeMirror editor for htmlInput textarea
  const textarea = document.getElementById('htmlInput');
  const editor = CodeMirror.fromTextArea(textarea, {
    mode: 'htmlmixed',
    theme: 'material',
    lineNumbers: true,
    lineWrapping: true,
    autoCloseTags: true,
    matchBrackets: true,
  });

const originalUrlInput = document.getElementById('originalUrlInput');
  const downloadBtn = document.getElementById('downloadBtn');
  const manualPasteBtn = document.getElementById('manualPasteBtn');
  const textModeBtn = document.getElementById('textModeBtn');
  const checkLayoutBtn = document.getElementById('checkLayoutBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const progressContainer = document.getElementById('progressContainer');
  const progressText = document.getElementById('progressText');
  const stopBtn = document.getElementById('stopBtn');
  const krhredUnitsContainer = document.getElementById('krhredUnitsContainer');
  
  // AbortController for stopping operations
  let abortController = null;
  let currentOperation = null;

  // Toast notification - using global toast manager
  function showToast(message, type = 'info') {
    if (type === 'success' && window.toastSuccess) {
      window.toastSuccess(message);
    } else if (type === 'error' && window.toastError) {
      window.toastError(message);
    } else if (type === 'warning' && window.toastWarning) {
      window.toastWarning(message);
    } else if (window.toastInfo) {
      window.toastInfo(message);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  // Progress indicator functions
  function showProgress(text, operation) {
    progressText.textContent = text;
    progressContainer.classList.remove('hidden');
    currentOperation = operation;
    abortController = new AbortController();
  }

  function hideProgress() {
    progressContainer.classList.add('hidden');
    currentOperation = null;
    abortController = null;
  }

  // Stop button functionality
  stopBtn.addEventListener('click', () => {
    if (abortController) {
      abortController.abort();
      console.log('Operation stopped');
      hideProgress();
    }
  });

  // Helper function to validate URL
  function isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Helper function to validate URLholders <%[KRHRED_Unit_XX]|%> with textbox values or remove if empty
  checkLayoutBtn.addEventListener('click', () => {
    console.log('Check Layout button clicked');
    let content = editor.getValue();
    console.log('Editor content length:', content.length);
    console.log('Editor content preview:', content.substring(0, 200));
    
    const inputs = krhredUnitsContainer.querySelectorAll('input[id^="krhred_unit_"]');
    console.log('KRHRED inputs found:', inputs.length);
    
    let hasValidKrhred = false;
    
    inputs.forEach(input => {
      const num = input.id.replace('krhred_unit_', '');
      const regex = new RegExp(`<%\\[KRHRED_Unit_${num}\\]\\|%>`, 'g');
      if (input.value && input.value.trim() !== '') {
        content = content.replace(regex, input.value);
        hasValidKrhred = true;
        console.log(`Replaced KRHRED_Unit_${num} with: ${input.value}`);
      } else {
        // Remove empty KRHRED placeholders completely
        content = content.replace(regex, '');
        console.log(`Removed empty KRHRED_Unit_${num}`);
      }
    });
    
    console.log('Has valid KRHRED:', hasValidKrhred);
    
    if (!hasValidKrhred) {
      console.log('No KRHRED values to apply. Please fill in KRHRED values first.');
      return;
    }
    
    // Fix image URLs to absolute URLs if original URL is provided
    const originalUrlValue = document.getElementById('originalUrlInput').value.trim();
    console.log('Original URL:', originalUrlValue);
    
    // Convert relative image URLs to absolute URLs
    let processedContent = content;
    if (originalUrlValue) {
      try {
        const baseUrl = new URL(originalUrlValue);
        const baseUrlString = baseUrl.origin + baseUrl.pathname.replace(/\/[^\/]*$/, '/');
        
        // Convert relative URLs to absolute
        processedContent = content.replace(/src="(?!https?:\/\/)([^"]+)"/g, (match, p1) => {
          const relativePath = p1.replace(/"/g, '');
          // Don't convert if already absolute, data URL, or protocol-relative
          if (relativePath.startsWith('data:') || relativePath.startsWith('//')) {
            return match;
          }
          return `src="${baseUrlString}${relativePath}"`;
        });
        console.log('Processed content with absolute URLs');
      } catch (e) {
        console.error('Error processing URLs:', e);
        processedContent = content; // Fallback to original content
      }
    }
    
    console.log('Opening processed content in new tab');
    
    // Save content as a Blob and open in new tab
    const blob = new Blob([processedContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    console.log('Layout checked successfully! Opening in new tab...');
  });

  addKrhredBtn.addEventListener('click', () => {
    // Find the highest current krhred_unit number
    const inputs = krhredUnitsContainer.querySelectorAll('input[id^="krhred_unit_"]');
    let maxNum = 29;
    inputs.forEach(input => {
      const num = parseInt(input.id.replace('krhred_unit_', ''), 10);
      if (num > maxNum) maxNum = num;
    });
    const newNum = maxNum + 1;

    // Get input grid container
    const inputGrid = krhredUnitsContainer.querySelector('#inputGrid');
    if (!inputGrid) return;

    // Calculate position for 4 columns, unlimited rows
    const totalExisting = inputs.length; // Should be 8 initially
    const columnIndex = totalExisting % 4; // Which column (0-3)
    const rowIndex = Math.floor(totalExisting / 4); // Which row (0, 1, 2, etc.)

    // Create new input
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'flex-start';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `krhred_unit_${newNum}`;
    input.name = `krhred_unit_${newNum}`;
    input.placeholder = newNum.toString();
    input.className = 'lc-input-field';
    div.appendChild(input);

    // Insert in correct position for 4 columns layout
    const existingDivs = inputGrid.querySelectorAll('div');
    const insertIndex = rowIndex * 4 + columnIndex;
    
    if (insertIndex < existingDivs.length) {
      inputGrid.insertBefore(div, existingDivs[insertIndex]);
    } else {
      inputGrid.appendChild(div);
    }

    // Add input color feedback
    input.addEventListener('input', () => {
      const length = input.value.trim().length;
      if (length > 60) {
        input.style.backgroundColor = 'red';
      } else if (length > 0) {
        input.style.backgroundColor = 'lightgreen';
      } else {
        input.style.backgroundColor = '';
      }
    });

    // Show success message
    console.log(`Unit ${newNum} added successfully!`);
  });

  // Input color feedback for existing inputs
  const existingInputs = krhredUnitsContainer.querySelectorAll('input[id^="krhred_unit_"]');
  existingInputs.forEach(input => {
    input.addEventListener('input', () => {
      const length = input.value.trim().length;
      if (length > 60) {
        input.style.backgroundColor = 'red';
      } else if (length > 0) {
        input.style.backgroundColor = 'lightgreen';
      } else {
        input.style.backgroundColor = '';
      }
    });
  });

  // Show/hide download button based on URL input
  originalUrlInput.addEventListener('input', () => {
    if (originalUrlInput.value.trim()) {
      downloadBtn.style.display = 'flex';
      manualPasteBtn.style.display = 'flex';
      textModeBtn.style.display = 'flex';
      // Auto-trigger download after a short delay if URL looks valid
      const url = originalUrlInput.value.trim();
      if (isValidUrl(url)) {
        setTimeout(() => {
          if (originalUrlInput.value.trim() === url) {
            downloadBtn.click();
          }
        }, 0);
      }
    } else {
      downloadBtn.style.display = 'none';
      manualPasteBtn.style.display = 'none';
      textModeBtn.style.display = 'none';
    }
  });

  // Manual paste button functionality
  manualPasteBtn.addEventListener('click', () => {
    const url = originalUrlInput.value.trim();
    if (!url) {
      console.log('Please enter a URL first.');
      return;
    }
    
    // Show progress
    showProgress('Opening page in new tab...', 'open-tab');
    
    // Open URL in new tab after a short delay
    setTimeout(() => {
      window.open(url, '_blank');
      localStorage.setItem('layoutCheckerURL', url);
      console.log('Page opened in new tab. Please copy source code (Ctrl+U or Right-click → View Page Source) and paste it here.');
      setTimeout(() => {
        hideProgress();
      }, 1000);
    }, 500);
  });

  // Text mode button functionality
  textModeBtn.addEventListener('click', async () => {
    const url = originalUrlInput.value.trim();
    if (!url) {
      console.log('Please enter a URL first.');
      return;
    }
    
    // Show progress
    showProgress('Fetching as plain text...', 'fetch-text');
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'text/plain,text/html,*/*;q=0.8'
        },
        signal: abortController.signal
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch');
      }
      
      const content = await response.text();
      
      if (content && content.includes('<html')) {
        editor.setValue(content);
        console.log('Content loaded successfully!');
        generateKrhredColumns(content);
      } else {
        console.log('Unable to fetch content as plain text. Please use Manual Paste option.');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Fetch cancelled');
      } else {
        console.log('Failed to fetch content. Please use Manual Paste option.');
      }
    } finally {
      hideProgress();
    }
  });

  // Helper function to validate URL
  function isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Function to detect krhred_unit_xx in HTML and generate columns
  function generateKrhredColumns(htmlContent, showNotification = true) {
    // DEBUG: Log function start
    console.log('=== generateKrhredColumns START ===');
    console.log('HTML content length:', htmlContent.length);
    console.log('HTML content preview:', htmlContent.substring(0, 200) + '...');
    
    // Find all krhred_unit_xx patterns in HTML
    const regex = /<%\[KRHRED_Unit_(\d+)\]\|%>/g;
    const matches = [];
    let match;
    
    while ((match = regex.exec(htmlContent)) !== null) {
      const unitNumber = parseInt(match[1], 10);
      if (!matches.includes(unitNumber)) {
        matches.push(unitNumber);
      }
    }
    
    // DEBUG: Log regex matches
    console.log('Regex matches found:', matches);
    console.log('Matches sorted:', matches.sort((a, b) => a - b));
    
    // Sort matches
    matches.sort((a, b) => a - b);
    
    // Get input grid container
    const inputGrid = krhredUnitsContainer.querySelector('#inputGrid');
    if (!inputGrid) {
      console.log('ERROR: inputGrid not found!');
      return;
    }
    
    // DEBUG: Log grid container
    console.log('Input grid container found:', inputGrid);
    
    // Get existing krhred inputs (don't clear them)
    const currentInputs = krhredUnitsContainer.querySelectorAll('input[id^="krhred_unit_"]');
    const existingNumbers = Array.from(currentInputs).map(input => 
      parseInt(input.id.replace('krhred_unit_', ''), 10)
    );
    
    // DEBUG: Log existing inputs
    console.log('Existing inputs found:', existingNumbers);
    console.log('Existing input elements:', currentInputs.length);
    
    // Remove units that are not in the HTML (including default units if not in HTML)
    currentInputs.forEach(input => {
      const unitNumber = parseInt(input.id.replace('krhred_unit_', ''), 10);
      if (!matches.includes(unitNumber)) {
        console.log(`Removing unit ${unitNumber} - not in HTML`);
        input.parentElement.remove();
      }
    });
    
    // Add new units that are in HTML but don't exist
    matches.forEach((unitNumber, index) => {
      if (!existingNumbers.includes(unitNumber)) {
        // DEBUG: Log each unit creation
        console.log(`Creating unit ${unitNumber} at index ${index}`);
        
        // Calculate position for 4x2 grid (8 units per row)
        const rowPosition = Math.floor(index / 8); // Which row (0-indexed)
        const columnPosition = index % 8; // Which position in row (0-7)
        const gridColumn = Math.floor(columnPosition / 2); // Which column (0-3)
        const gridRow = Math.floor(columnPosition / 2); // Which row in column (0-1)
        
        // DEBUG: Log positioning calculation
        console.log(`Unit ${unitNumber}: rowPosition=${rowPosition}, columnPosition=${columnPosition}, gridColumn=${gridColumn}, gridRow=${gridRow}`);
        
        // Create new input
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'flex-start';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `krhred_unit_${unitNumber}`;
        input.name = `krhred_unit_${unitNumber}`;
        input.placeholder = unitNumber.toString();
        input.className = 'lc-input-field';
        div.appendChild(input);
        inputGrid.appendChild(div);
        
        // Add input color feedback
        input.addEventListener('input', () => {
          const length = input.value.trim().length;
          if (length > 60) {
            input.style.backgroundColor = 'red';
          } else if (length > 0) {
            input.style.backgroundColor = 'lightgreen';
          } else {
            input.style.backgroundColor = '';
          }
        });
        
        // Add auto-save event listener
        input.addEventListener('input', () => {});
      } else {
        // DEBUG: Log skipped units
        console.log(`Skipping unit ${unitNumber} - already exists`);
      }
    });
    
    // DEBUG: Log final state
    const finalInputs = krhredUnitsContainer.querySelectorAll('input[id^="krhred_unit_"]');
    console.log('Final input count:', finalInputs.length);
    console.log('=== generateKrhredColumns END ===');
    
    // Show combined toast notification for HTML fetch and KRHRED units found
    if (showNotification) {
      if (matches.length > 0) {
        console.log(`Generated ${matches.length} krhred_unit columns:`, matches);
        console.log(`HTML fetched! Found ${matches.length} KRHRED units: ${matches.join(', ')}`);
      } else {
        console.log('HTML fetched! No KRHRED units found. Showing default layout.');
      }
    }
  }

  // Download and auto-paste HTML source code
  downloadBtn.addEventListener('click', async () => {
    const url = originalUrlInput.value.trim();
    if (!url) {
      console.log('Please enter a URL first.');
      return;
    }

    try {
      // Show progress
      showProgress('Fetching HTML content...', 'download');
      
      // Disable button during fetch
      downloadBtn.disabled = true;
      downloadBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px; animation: spin 1s linear infinite;"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>Fetching...';

      // List of working CORS proxy servers - prioritized by reliability
      const corsProxies = [
        'https://api.allorigins.win/get?url=',
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://r.jina.ai/http://', // Jina AI proxy - very reliable
        'https://r.jina.ai/https://', // Jina AI proxy for HTTPS
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url=', // Alternative allorigins endpoint
        'https://thingproxy.freeboard.io/fetch/',
        'https://cors-anywhere.herokuapp.com/'
      ];

      let htmlContent = null;
      let usedProxy = null;
      let lastError = null;

      // Try direct fetch first with timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, { 
          signal: abortController ? abortController.signal : controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            htmlContent = await response.text();
            console.log('Direct connection successful!');
          }
        }
      } catch (error) {
        lastError = error;
        // Continue to try proxies
      }

      // If direct fetch failed, try CORS proxies sequentially
      if (!htmlContent) {
        for (let i = 0; i < corsProxies.length; i++) {
          const proxy = corsProxies[i];
          
          try {
            console.log(`Trying proxy ${i + 1}/${corsProxies.length}: ${proxy}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout per proxy
            
            let proxyUrl;
            let response;
            
            // Special handling for different proxy formats
            if (proxy.includes('r.jina.ai')) {
              // Jina AI proxy - remove protocol from URL first
              const cleanUrl = url.replace(/^https?:\/\//, '');
              proxyUrl = proxy + cleanUrl;
              response = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: {
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
              });
            } else if (proxy.includes('raw?url=')) {
              // Raw endpoint
              proxyUrl = proxy + encodeURIComponent(url);
              response = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: {
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
              });
            } else {
              // Standard proxy
              proxyUrl = proxy + encodeURIComponent(url);
              response = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: {
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
              });
            }
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              let content;
              if (proxy.includes('allorigins')) {
                const data = await response.json();
                content = data.contents || data.contents;
              } else {
                content = await response.text();
              }
              
              // Validate content
              if (content && content.length > 100 && (content.includes('<') || content.includes('<html'))) {
                htmlContent = content;
                usedProxy = proxy;
                console.log(`Success with proxy: ${proxy}`);
                break;
              } else {
                console.log(`Proxy returned invalid content (${content?.length || 0} chars): ${proxy}`);
              }
            } else {
              console.log(`Proxy returned status ${response.status}: ${proxy}`);
              // If proxy returns 403, it might be blocked for this domain
              if (response.status === 403) {
                console.log(`Proxy blocked for this domain: ${proxy}`);
              }
            }
          } catch (proxyError) {
            console.log(`Proxy ${proxy} failed:`, proxyError.message);
            lastError = proxyError;
            continue;
          }
        }
      }

      if (htmlContent) {
        editor.setValue(htmlContent);
        // Directly call generateKrhredColumns to create input fields
        generateKrhredColumns(htmlContent);
      } else {
        throw new Error(lastError?.message || 'All fetch attempts failed');
      }

    } catch (error) {
      console.error('Error fetching HTML:', error);
      console.log('Failed to fetch HTML content. Please try again or use Manual Paste option.');
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>Download';
      hideProgress();
    }
  });

  // Apply krhred values functionality
  const applyKrhredBtn = document.getElementById('applyKrhredBtn');
  const krhredInput = document.getElementById('krhredInput');

  applyKrhredBtn.addEventListener('click', () => {
    console.log('Apply KRHRED button clicked');
    const krhredText = krhredInput.value.trim();
    console.log('KRHRED text length:', krhredText.length);
    console.log('KRHRED text preview:', krhredText.substring(0, 200));
    
    if (!krhredText) {
      console.log('Please paste krhred values first.');
      return;
    }

    // Parse krhred values in new format: attr:KRHRED_Unit_XX : <next line value>
    const lines = krhredText.split('\n');
    const krhredValues = {};
    console.log('Total lines:', lines.length);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('attr:KRHRED_Unit_')) {
        const key = line.replace('attr:', '').replace(' :', '').replace(':', '');
        const value = lines[i + 1] ? lines[i + 1].trim() : '';
        krhredValues[key] = value;
        console.log(`Parsed: ${key} = ${value}`);
        i++; // skip value line
      }
    }
    
    console.log('KRHRED values found:', krhredValues);

    // Apply values to corresponding input fields
    Object.keys(krhredValues).forEach(key => {
      const unitNumber = key.replace('KRHRED_Unit_', '');
      const inputField = document.getElementById(`krhred_unit_${unitNumber}`);
      console.log(`Looking for input: krhred_unit_${unitNumber}`);
      if (inputField) {
        inputField.value = krhredValues[key];
        inputField.dispatchEvent(new Event('input')); // color update
        console.log(`Applied value to unit ${unitNumber}`);
      } else {
        console.log(`Input field not found for unit ${unitNumber}`);
      }
    });
    
    console.log('KRHRED values applied successfully!');
  });

  // Clear All functionality
  clearAllBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all KRHRED values?')) {
      performClearAll();
      console.log('KRHRED values cleared successfully!');
    } else {
      console.log('Clear action cancelled.');
    }
  });

  function performClearAll() {
    // Clear all KRHRED unit values only
    const inputs = krhredUnitsContainer.querySelectorAll('input[id^="krhred_unit_"]');
    inputs.forEach(input => {
      input.value = '';
      input.style.backgroundColor = '';
    });
    
    // Clear KRHRED textarea only
    document.getElementById('krhredInput').value = '';
  }

  // Handle F5 refresh - clear data without prompt
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
      e.preventDefault();
      performClearAll();
      console.log('Data cleared. Refreshing page...');
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  });

  // Check for stored source when page loads
  window.addEventListener('load', () => {
    const storedSource = localStorage.getItem('layoutCheckerSource');
    const storedURL = localStorage.getItem('layoutCheckerURL');

    if (storedSource) {
      editor.setValue(storedSource);
      // generateKrhredColumns will be called by editor.on('change') event
      if (storedURL) {
        originalUrlInput.value = storedURL;
        downloadBtn.style.display = 'flex';
        manualPasteBtn.style.display = 'flex';
      }
      console.log('Source code automatically pasted from previous page!');
    }
    localStorage.removeItem('layoutCheckerSource');
    localStorage.removeItem('layoutCheckerURL');
  });

  // State persistence - DISABLED
  // function saveState() {
  //   const state = {
  //     htmlContent: editor.getValue(),
  //     originalUrl: document.getElementById('originalUrlInput').value,
  //     krhredValues: {}
  //   };
  //   const krhredInputs = document.querySelectorAll('input[id^="krhred_unit_"]');
  //   krhredInputs.forEach(input => {
  //     state.krhredValues[input.id] = input.value;
  //   });
  //   localStorage.setItem('layoutChecker_state', JSON.stringify(state));
  // }

  // function loadState() {
  //   const saved = localStorage.getItem('layoutChecker_state');
  //   if (saved) {
  //     try {
  //       const state = JSON.parse(saved);
  //       if (state.htmlContent) { 
  //         editor.setValue(state.htmlContent);
  //         // generateKrhredColumns will be called by editor.on('change') event
  //       }
  //       if (state.originalUrl) {
  //         document.getElementById('originalUrlInput').value = state.originalUrl;
  //         document.getElementById('downloadBtn').style.display = 'flex';
  //         document.getElementById('manualPasteBtn').style.display = 'flex';
  //       }
  //       if (state.krhredValues) {
  //         Object.keys(state.krhredValues).forEach(inputId => {
  //           const input = document.getElementById(inputId);
  //           if (input) {
  //             input.value = state.krhredValues[inputId];
  //             input.dispatchEvent(new Event('input'));
  //           }
  //         });
  //       }
  //     } catch (e) {
  //       console.error('Error loading state:', e);
  //     }
  //   }
  // }

  // Auto-save on input changes - DISABLED
  editor.on('change', () => {
    const content = editor.getValue();
    if (content.trim()) {
      generateKrhredColumns(content, false);
    }
    //  // DISABLED
  });
  // document.getElementById('originalUrlInput').addEventListener('input', saveState); // DISABLED
  // document.getElementById('krhredInput').addEventListener('input', saveState); // DISABLED


  // Auto-save for existing krhred inputs - DISABLED
  const existingKrhredInputs = document.querySelectorAll('input[id^="krhred_unit_"]');
  existingKrhredInputs.forEach(input => {
    // input.addEventListener('input', saveState); // DISABLED
  });


  // Load state when page loads - DISABLED
  // window.addEventListener('load', loadState); // DISABLED

  // Save state before leaving page - DISABLED
  // window.addEventListener('beforeunload', saveState); // DISABLED
