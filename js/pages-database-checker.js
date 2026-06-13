/* ========= Constants ========= */
const LINES_PER_PAGE   = 500; // Reduced from 1000 for better performance
const MAX_MEMORY_USAGE = 100 * 1024 * 1024; // 100MB
const MAX_RENDER_ROWS  = 1000; // Reduced from 2000
const VIRTUAL_BUFFER_SIZE = 50; // Increased back to 50 for better visibility
const OBJECT_POOL_SIZE = 200; // Reduced from 500
const DEBOUNCE_DELAY = 100; // Added for scroll events
const PACKAGE_FILE_TYPES = ['CustMast', 'CustPref', 'CustSubs', 'CustAttr'];
const PACKAGE_FILE_PATTERN = /^(.*)-(CustMast|CustPref|CustSubs|CustAttr)\.txt$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PACKAGE_FINDINGS_BATCH_SIZE = 200;
const MAX_STORED_PACKAGE_FINDINGS = 10000;
const PACKAGE_TYPE_SCAN_BYTES = 512 * 1024;

// Make constants configurable for performance mode
Object.defineProperty(window, 'LINES_PER_PAGE', { value: LINES_PER_PAGE, writable: true });
Object.defineProperty(window, 'VIRTUAL_BUFFER_SIZE', { value: VIRTUAL_BUFFER_SIZE, writable: true });
Object.defineProperty(window, 'OBJECT_POOL_SIZE', { value: OBJECT_POOL_SIZE, writable: true });

/* ========= Regex ========= */
const unitRegex  = /^KRHRED(?:_Unit)?_\d+$/i;

/* ========= File reader ========= */
class FileProcessor {
  constructor(){ this.reset(); }
  reset(){
    this.currentFile = null;
    this.fileContent = '';
    this.currentLines = [];
    this.totalSize = 0;
    this.loadedSize = 0;
  }
  updateProgress(){
    const percent = (this.loadedSize / this.totalSize) * 100;
    const wrap = document.getElementById('loadingWrapper');
    if (wrap){
      wrap.style.visibility = 'visible';
      document.getElementById('progressText').textContent = `${Math.round(percent)}%`;
    }
  }
  async readFile(file, onProgress){
    this.reset();
    this.currentFile = file;
    this.totalSize = file.size;

    // Use streaming with chunked processing for better performance
    const chunkSize = 128 * 1024; // Increased to 128KB for fewer chunks
    const reader  = file.stream().getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const lines = [];
    let lineCount = 0;
    
    // Pre-allocate array if we know the approximate size
    const estimatedLines = Math.floor(file.size / 50); // Rough estimate
    if (estimatedLines > 10000) {
      // For large files, use a more memory-efficient approach
      this.currentLines = new Array(estimatedLines);
      this.currentLines.length = 0;
    }

    // Performance monitoring
    const startTime = performance.now();
    let lastYield = 0;

    try{
      while(true){
        const {done, value} = await reader.read();
        if (done) break;
        
        this.loadedSize += value.length;
        const text = decoder.decode(value, {stream:true});
        buffer += text;
        
        // Process lines in chunks to avoid blocking
        const lastNewline = buffer.lastIndexOf('\n');
        if (lastNewline !== -1) {
          const chunk = buffer.substring(0, lastNewline);
          const chunkLines = chunk.split('\n');
          
          // Use push with spread for better performance on smaller chunks
          if (chunkLines.length < 1000) {
            lines.push(...chunkLines);
          } else {
            // For large chunks, append individually to avoid call stack limits
            for (const line of chunkLines) {
              lines.push(line);
            }
          }
          
          lineCount += chunkLines.length;
          
          buffer = buffer.substring(lastNewline + 1);
        }
        
        this.updateProgress();
        if (onProgress) onProgress(this.loadedSize, this.totalSize);
        
        // Adaptive yielding based on performance
        const now = performance.now();
        if (now - lastYield > 16 || lineCount % 10000 === 0) { // Yield every 16ms or 10k lines
          await new Promise(r=>setTimeout(r,0));
          lastYield = now;
        }
      }
      
      // Add remaining content
      if (buffer) {
        lines.push(buffer);
      }
      
      // Log performance metrics
      const endTime = performance.now();
      console.log(`File read performance: ${lines.length} lines in ${(endTime - startTime).toFixed(2)}ms`);
    } finally { 
      reader.releaseLock(); 
    }

    const wrap = document.getElementById('loadingWrapper');
    if (wrap) wrap.style.visibility = 'hidden';
    this.currentLines = lines;
    return lines;
  }
}

/* ========= File reader ========= */
class VirtualScroller {
  constructor(container, itemHeight = 20){ // Reduced from 40 to 20 for compact display
    this.container = container;
    // Cari virtual-scroll-content atau buat baru setelah header
    this.content   = container.querySelector('.virtual-scroll-content');
    if (!this.content) {
      // Buat div inner jika tidak ada
      this.content = document.createElement('div');
      this.content.className = 'virtual-scroll-content';
      container.appendChild(this.content);
    }
    
    // Ensure container has proper styles for scrolling
    container.style.overflow = 'auto';
    container.style.position = 'relative';
    container.style.height = '100%'; // Ensure container has full height
    
    this.itemHeight= itemHeight;
    this.items     = [];
    this.visible   = new Set();
    this.renderedElements = new Map(); // Cache rendered elements
    this.lastScrollTop = 0;
    this.scrollTimeout = null;
    this.setItemsTimeout = null;
    
    // Performance optimizations
    this.isScrolling = false;
    this.scrollEndTimeout = null;
    
    // Object pool for row elements
    this.elementPool = [];
    this.initObjectPool();
    
    // Use IntersectionObserver for better performance
    this.initIntersectionObserver();
    
    // Throttled scroll handler
    this.onScroll = this.throttle(() => {
      const scrollStart = performance.now();
      this.isScrolling = true;
      this.update();
      
      // Clear previous timeout
      if (this.scrollEndTimeout) {
        clearTimeout(this.scrollEndTimeout);
      }
      
      // Set scroll end detection
      this.scrollEndTimeout = setTimeout(() => {
        this.isScrolling = false;
        this.cleanupInvisibleElements();
      }, 150);
      
      // Log scroll performance for debugging
      if (this.items.length > 10000) {
        const scrollTime = performance.now() - scrollStart;
        if (scrollTime > 16) {
          console.log(`\u26a0\ufe0f Slow scroll update: ${scrollTime.toFixed(2)}ms`);
        }
      }
    }, DEBOUNCE_DELAY);
    
    container.addEventListener('scroll', this.onScroll, { passive: true });
    this.observer = new ResizeObserver(()=>{
      if (this.content) {
        // Force height recalculation
        if (this.container.clientHeight === 0) {
          const rect = this.container.getBoundingClientRect();
          if (rect.height > 0) {
            this.container.style.height = `${rect.height}px`;
          }
        }
        this.update();
      }
    });
    this.observer.observe(container);
    
    // Also observe the parent for size changes
    if (container.parentElement) {
      this.observer.observe(container.parentElement);
    }
  }
  
  // Simple throttle function
  throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    return function (...args) {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }
  
  // Cleanup invisible elements to free memory
  cleanupInvisibleElements() {
    if (this.renderedElements.size > OBJECT_POOL_SIZE * 2) {
      // Remove elements far from viewport
      const top = this.container.scrollTop;
      const h = this.container.clientHeight;
      const viewportStart = Math.floor(top / this.itemHeight) - VIRTUAL_BUFFER_SIZE * 2;
      const viewportEnd = Math.ceil((top + h) / this.itemHeight) + VIRTUAL_BUFFER_SIZE * 2;
      
      const toRemove = [];
      this.renderedElements.forEach((element, index) => {
        if (index < viewportStart || index > viewportEnd) {
          toRemove.push(index);
        }
      });
      
      toRemove.forEach(idx => {
        const el = this.renderedElements.get(idx);
        if (el) {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
          this.returnElementToPool(el);
          this.renderedElements.delete(idx);
        }
      });
    }
  }
  
  initObjectPool() {
    for (let i = 0; i < OBJECT_POOL_SIZE; i++) {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.width = '100%';
      div.style.height = `${this.itemHeight}px`; // Set explicit height
      div.style.display = 'none'; // Hide initially
      div.className = 'data-row';
      this.elementPool.push(div);
    }
  }
  
  // Parse and format a line for Notepad++ style display
  formatLineToText(line, lineNumber) {
    // Return just the line content - line number will be shown via CSS
    return line;
  }
  
  getElementFromPool() {
    if (this.elementPool.length > 0) {
      return this.elementPool.pop();
    }
    // Pool exhausted, create new element
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.width = '100%';
    div.style.height = `${this.itemHeight}px`; // Set explicit height
    return div;
  }
  
  returnElementToPool(element) {
    if (this.elementPool.length < OBJECT_POOL_SIZE) {
      element.style.display = 'none';
      element.textContent = '';
      this.elementPool.push(element);
    } else {
      element.remove();
    }
  }
  
  initIntersectionObserver() {
    // Fallback to scroll-based approach if IntersectionObserver not available
    if (!('IntersectionObserver' in window)) return;
    
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const index = parseInt(entry.target.getAttribute('data-index'));
        if (entry.isIntersecting) {
          // Element is visible, ensure content is rendered
          if (!entry.target.textContent && this.items[index]) {
            entry.target.textContent = this.items[index];
          }
        }
      });
    }, {
      root: this.container,
      rootMargin: '50px'
    });
  }
  setItems(items){
    // Debounce setItems to avoid multiple rapid updates
    if (this.setItemsTimeout) {
      clearTimeout(this.setItemsTimeout);
    }
    
    this.setItemsTimeout = setTimeout(() => {
      this.setItemsImmediate(items);
      this.setItemsTimeout = null;
    }, 32); // Increased from 16ms to ~30fps for better performance
  }
  
  setItemsImmediate(items){
    const setItemsStart = performance.now();
    
    // Clear existing elements efficiently
    this.clearAllElements();
    
    this.items = items;
    
    // Calculate dynamic heights based on content
    const calculateItemHeight = (line) => {
      if (!line) return this.itemHeight;
      // Approximate height based on text length (assuming ~100 chars per line for data)
      const textLength = line.length;
      const estimatedLines = Math.ceil(textLength / 100);
      return Math.max(this.itemHeight, estimatedLines * 16); // 16px per line
    };
    
    // Calculate total height
    let totalHeight = 0;
    this.itemPositions = [];
    for (let i = 0; i < items.length; i++) {
      this.itemPositions.push(totalHeight);
      totalHeight += calculateItemHeight(items[i]);
    }
    
    this.content.style.height = `${totalHeight}px`;
    this.content.style.marginTop = '0px';
    
    // Ensure container and content have proper positioning
    this.content.style.position = 'relative';
    this.content.style.width = '100%';
    
    // Force a reflow to ensure dimensions are calculated
    this.content.offsetHeight;
    
    // Ensure container is scrollable
    this.container.style.overflow = 'auto';
    this.container.style.position = 'relative';
    
    // Initial update - only render visible items
    this.update();
    
    if (items.length > 1000) {
      console.log(`\u23f1\ufe0f setItems completed in ${(performance.now() - setItemsStart).toFixed(2)}ms for ${items.length} items`);
    }
  }
  
  clearAllElements() {
    // Return all elements to pool
    this.renderedElements.forEach((element) => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.returnElementToPool(element);
    });
    this.renderedElements.clear();
    this.visible.clear();
  }
  update(){
    const updateStart = performance.now();
    
    if (!this.content) return;
    
    // Ensure container has proper height
    if (this.container.clientHeight === 0) {
      // Force container to have height
      const rect = this.container.getBoundingClientRect();
      if (rect.height > 0) {
        this.container.style.height = `${rect.height}px`;
      }
    }
    
    const top = this.container.scrollTop;
    const h   = this.container.clientHeight || this.container.offsetHeight || 400; // Fallback height
    
    // Define calculateItemHeight function
    const calculateItemHeight = (line) => {
      if (!line) return this.itemHeight;
      // Approximate height based on text length (assuming ~100 chars per line for data)
      const textLength = line.length;
      const estimatedLines = Math.ceil(textLength / 100);
      return Math.max(this.itemHeight, estimatedLines * 16); // 16px per line
    };
    
    // Find visible items based on positions
    let start = 0;
    let end = 0;
    
    if (this.itemPositions && this.itemPositions.length > 0) {
      for (let i = 0; i < this.itemPositions.length; i++) {
        if (this.itemPositions[i] < top + h) {
          end = i + 1;
        }
        if (this.itemPositions[i] + calculateItemHeight(this.items[i]) < top) {
          start = i + 1;
        }
      }
    } else {
      // Fallback to fixed height calculation
      const visibleCount = Math.ceil(h / this.itemHeight);
      start = Math.max(0, Math.floor(top / this.itemHeight));
      end = Math.min(this.items.length, start + visibleCount + VIRTUAL_BUFFER_SIZE * 2);
    }
    
    end = Math.min(this.items.length, end + VIRTUAL_BUFFER_SIZE); // Add buffer

    // Clear visible set to force re-render of all visible items
    const oldVisible = this.visible;
    this.visible = new Set();
    
    // Skip update if scrolling and range hasn't changed significantly
    if (this.isScrolling && this._lastUpdateRange && 
        Math.abs(this._lastUpdateRange.start - start) < 5 && 
        Math.abs(this._lastUpdateRange.end - end) < 5) {
      return;
    }
    this._lastUpdateRange = { start, end };

    // Performance logging for large updates
    const itemsToRender = end - start;
    if (itemsToRender > 100) {
      console.log(`\ud83d\udd0d VirtualScroller updating: ${itemsToRender} items (range: ${start}-${end})`);
    }

    // Use DocumentFragment for batch DOM operations
    const frag = document.createDocumentFragment();
    const renderStart = performance.now();
    let renderedCount = 0;
    let reusedCount = 0;

    // Check which elements need to be added or updated
    for (let i=start;i<end;i++){
      this.visible.add(i);
      
      // Check if element already exists and is in the right position
      let div = this.renderedElements.get(i);
      if (!div) {
        div = this.getElementFromPool();
        renderedCount++;
      } else {
        reusedCount++;
        // Remove from parent if it's already attached
        if (div.parentNode) {
          div.parentNode.removeChild(div);
        }
      }
      // Set position and height based on calculated values
      const itemHeight = this.itemPositions ? 
        calculateItemHeight(this.items[i]) : 
        this.itemHeight;
      
      const topPosition = this.itemPositions ? 
        this.itemPositions[i] : 
        i * this.itemHeight;
      
      // Always set content for visible items
      const line = this.items[i];
      const lineNumber = i + 1;
      
      div.style.height = `${itemHeight}px`;
      div.style.top = `${topPosition}px`;
      div.style.display = '';
      div.setAttribute('data-index', i);
      div.setAttribute('data-line-number', `${lineNumber}:`);
      
      if (line) {
        div.textContent = this.formatLineToText(line, lineNumber);
      }
      
      this.renderedElements.set(i, div);
      frag.appendChild(div);
    }

    // Performance logging
    if (itemsToRender > 100) {
      console.log(`\u23f1\ufe0f VirtualScroller render: ${renderedCount} new, ${reusedCount} reused in ${(performance.now() - renderStart).toFixed(2)}ms`);
    }

    // Find elements to remove (from old visible set)
    oldVisible.forEach(idx => {
      if (!this.visible.has(idx)) {
        const el = this.renderedElements.get(idx);
        if (el) {
          if (this.intersectionObserver) {
            this.intersectionObserver.unobserve(el);
          }
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
          this.returnElementToPool(el);
          this.renderedElements.delete(idx);
        }
      }
    });

    // Batch DOM updates
    if (frag.children.length > 0) {
      this.content.appendChild(frag);
    }
  }
  
  onScrollThrottled(){
    if (this.scrollTimeout) {
      cancelAnimationFrame(this.scrollTimeout);
    }
    this.scrollTimeout = requestAnimationFrame(() => {
      this.update();
      this.scrollTimeout = null;
    });
  }
  
  onScroll(){ 
    this.onScrollThrottled();
  }
  
  destroy(){
    this.observer.disconnect();
    this.container.removeEventListener('scroll', this.onScroll);
    
    // Clear debounced timeouts
    if (this.setItemsTimeout) {
      clearTimeout(this.setItemsTimeout);
    }
    if (this.scrollTimeout) {
      cancelAnimationFrame(this.scrollTimeout);
    }
    
    // Clean up intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    
    // Clean up all elements and return to pool
    this.clearAllElements();
    
    // Clean up object pool
    this.elementPool.forEach(element => element.remove());
    this.elementPool = [];
  }
}

/* ========= Main App ========= */
class DatabaseChecker {
  constructor(){
    this.fp = new FileProcessor();
    this.currentLines = [];
    this.processedLinesCount = 0;
    this.isChecking = false;
    this.worker = null;
    this.databasePackages = new Map();
    this.selectedPackageKey = '';
    this.selectedPackage = null;
    this.lastPackageResult = null;
    this.packageValidationToken = 0;
    
    // Performance mode detection
    this.performanceMode = this.detectPerformanceMode();
    this.applyPerformanceSettings();
    
    // Initialize Web Worker if available
    this.initWorker();

    // Default schema (akan di-detect ulang saat file load)
    this.schema = { cmpgIdx:0, emailIdx:1, unitIdx:2, textIdx:3 };

    // Modal refs
    this.modal        = document.getElementById('searchModal');
    this.emailInput   = document.getElementById('emailQuery');
    this.emailInfoEl  = document.getElementById('emailMatchesInfo');
    this.rowsEl       = document.getElementById('krhredRows');

    // Initialize table header FIRST
    this.initializeTableHeader();
    
    // THEN initialize virtual scroller
    this.vs = new VirtualScroller(document.getElementById('databaseContent'));
    
    // Add scroll listener for auto-load with debounce
    this.autoLoadTimeout = null;
    this.vs.container.addEventListener('scroll', () => {
      const container = this.vs.container;
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 100) {
        // Near bottom, check if we should load more
        if (this.processedLinesCount < this.currentLines.length && !this.autoLoadTimeout) {
          this.autoLoadTimeout = setTimeout(() => {
            this.loadMore();
            this.autoLoadTimeout = null;
          }, 300);
        }
      }
    });

    this.bindEvents();
  }
  
  detectPerformanceMode() {
    // Simple performance detection based on hardware concurrency and memory
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 4;
    
    // Consider low-end if less than 4 cores or less than 4GB RAM
    return cores < 4 || memory < 4;
  }
  
  applyPerformanceSettings() {
    if (this.performanceMode) {
      // Reduce buffer sizes but still show all data
      window.VIRTUAL_BUFFER_SIZE = 25; // Increased from 15
      window.OBJECT_POOL_SIZE = 100;
      // Keep LINES_PER_PAGE for pagination only if needed
      
      // Add performance indicator
      document.body.classList.add('performance-mode');
      console.log('Performance mode enabled for low-end device');
    }
  }
  
  initializeTableHeader() {
    // No table header needed for Notepad++ style
    // This method is now empty
  }
  
  initWorker() {
    try {
      // Create worker from inline blob to avoid CORS issues
      const workerCode = `
        self.onmessage = function(e) {
          const { type, data } = e.data;
          
          switch(type) {
            case 'countUniqueCMPGIDs':
              countUniqueCMPGIDs(data);
              break;
          }
        };
        
        function countUniqueCMPGIDs({ lines }) {
          const uniqueIds = new Set();
          
          for (const line of lines) {
            if (!line || line.length === 0) continue;
            
            const pipeIndex = line.indexOf('|');
            if (pipeIndex === -1) continue;
            
            const cmpg = line.substring(0, pipeIndex).trim();
            if (cmpg) uniqueIds.add(cmpg);
          }
          
          self.postMessage({
            type: 'countResult',
            count: uniqueIds.size
          });
        }
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      
      this.worker.onmessage = (e) => {
        if (e.data.type === 'countResult') {
          this.handleWorkerCountResult(e.data.count);
        }
      };
    } catch (error) {
      console.log('Web Worker not available, using main thread');
      this.worker = null;
    }
  }
  
  handleWorkerCountResult(count) {
    const totalRowsEl = document.getElementById('totalRows');
    if (totalRowsEl) {
      totalRowsEl.textContent = count.toLocaleString();
    }
  }

  bindEvents(){
    document.getElementById('folderOpenBtn').addEventListener('click', ()=>this.openFolder());

    this.checkBtn = document.getElementById('checkBtn');
    this.checkBtn.addEventListener('click', ()=>{
      if (this.isChecking){ this.stopChecking(); } else { this.checkDatabase(); }
    });

    document.getElementById('loadMoreBtn').addEventListener('click', ()=>this.loadMore());

    // Modal & search
    document.getElementById('openSearchModalBtn').addEventListener('click', ()=>this.openSearchModal());
    document.getElementById('modalCloseBtn').addEventListener('click', ()=>this.closeSearchModal());
    document.getElementById('modalBackdrop').addEventListener('click', ()=>this.closeSearchModal());
    document.getElementById('searchEmailBtn').addEventListener('click', ()=>this.performEmailSearch());
    
    // Debounced search on input
    this.searchTimeout = null;
    this.emailInput.addEventListener('input', (e) => {
      // Don't trigger search on paste
      if (e.inputType === 'insertFromPaste') {
        return;
      }
      
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        if (e.target.value.trim()) {
          this.performEmailSearch();
        }
      }, 300);
    });
    
    this.emailInput.addEventListener('keydown', (e)=>{ 
      if (e.key === 'Enter') {
        clearTimeout(this.searchTimeout);
        this.performEmailSearch();
      }
    });

    // Selection sync (fallback)
    document.addEventListener('click', (e)=>{
      const item = e.target.closest('#fileList li, #fileList button.file');
      if (!item) return;
      document.querySelectorAll('#fileList .selected,[aria-selected="true"]').forEach(x=>{
        x.classList.remove('selected'); x.removeAttribute('aria-selected');
      });
      item.classList.add('selected'); item.setAttribute('aria-selected','true');
    });

    // Esc to close modal
    window.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape' && this.modalIsOpen()) this.closeSearchModal();
    });
  }

  /* ===== Modal ===== */
  modalIsOpen(){ return this.modal && (this.modal.hasAttribute('open') || this.modal.classList.contains('show')); }
  openSearchModal(){
    if (!this.currentLines.length){ alert('Please load a file first'); return; }
    this.detectSchema();
    this.rowsEl.innerHTML = '';
    this.emailInfoEl.textContent = 'Masukkan email lalu tekan Search.';
    this.modal.setAttribute('open','');
    this.modal.classList.add('show');
    setTimeout(()=>this.emailInput?.focus(),0);
  }
  closeSearchModal(){
    this.modal.classList.remove('show');
    this.modal.removeAttribute('open');
  }

  /* ===== Schema auto-detect ===== */
  detectSchema(){
    const sample = this.currentLines.slice(0, Math.min(600, this.currentLines.length));
    const votes = { email: new Map(), unit: new Map(), atSign: new Map() };
    let maxCols = 0;

    for (const line of sample){
      const parts = line.split('|');
      maxCols = Math.max(maxCols, parts.length);
      parts.forEach((f, idx)=>{
        const field = (f||'').trim();
        // email vote (strict)
        const isEmailStrict = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(field);
        if (isEmailStrict) votes.email.set(idx, (votes.email.get(idx)||0)+1);
        // fallback: contains '@'
        if (field.includes('@')) votes.atSign.set(idx, (votes.atSign.get(idx)||0)+1);
        // unit vote
        if (unitRegex.test(field)) votes.unit.set(idx, (votes.unit.get(idx)||0)+1);
      });
    }
    const maxKey = (m, def)=> m.size ? [...m.entries()].sort((a,b)=>b[1]-a[1])[0][0] : def;

    let emailIdx = maxKey(votes.email, undefined);
    if (emailIdx === undefined) emailIdx = maxKey(votes.atSign, 1); // fallback kalau email tidak valid
    const unitIdx  = maxKey(votes.unit, 2);

    let textIdx = unitIdx + 1;
    if (textIdx >= maxCols) textIdx = Math.max(3, maxCols - 1);
    const cmpgIdx = 0;

    this.schema = { cmpgIdx, emailIdx, unitIdx, textIdx };
  }

  /* ===== Search & render per-entry list ===== */
  performEmailSearch(){
    if (!this.currentLines.length){ alert('Please load a file first'); return; }
    const q = (this.emailInput.value || '').trim().toLowerCase();
    const { emailIdx, unitIdx, textIdx } = this.schema;

    // Clear previous results immediately
    this.rowsEl.innerHTML = '';
    this.emailInfoEl.textContent = 'Searching...';
    
    // Add loading state
    const modalContent = document.getElementById('modalResults');
    modalContent.classList.add('loading');

    // Use requestAnimationFrame for better performance
    requestAnimationFrame(async () => {
      const entries = []; // {unit, text, chars}
      let totalMatches = 0;

      // Batch processing for large datasets
      const batchSize = 1000;
      for (let i = 0; i < this.currentLines.length; i += batchSize) {
        const batch = this.currentLines.slice(i, i + batchSize);
        
        for (const line of batch) {
          const parts = line.split('|');
          const email = (parts[emailIdx]||'').trim().toLowerCase();
          const unit  = (parts[unitIdx]  ||'').trim();
          const text  = (parts[textIdx]  ||'').trim();

          if (q && !email.includes(q)) continue;
          if (!unitRegex.test(unit)) continue;

          totalMatches++;
          const normalizedUnit = unit.replace(/^krhred(?:_unit)?_/i, 'KRHRED_Unit_');
          entries.push({ unit: normalizedUnit, text, chars: text.length });
        }
        
        // Yield to browser periodically
        if (i % 5000 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // Store entries for copying
      this.currentSearchResults = entries;
      
      // Group entries by email for counting
      const codeGroups = new Map();
      if (q) {
        const { emailIdx } = this.schema;
        
        for (const line of this.currentLines) {
          const parts = line.split('|');
          const email = (parts[emailIdx]||'').trim().toLowerCase();
          const code = parts[0] || '';
          
          if (email.includes(q) && !codeGroups.has(code)) {
            codeGroups.set(code, {
              email: email,
              entries: []
            });
          }
        }
      }

      // Update info
      if (q) {
        const uniqueRecords = codeGroups.size;
        this.emailInfoEl.textContent = `Found ${uniqueRecords} record${uniqueRecords > 1 ? 's' : ''}`;
      } else {
        this.emailInfoEl.textContent = `Semua baris: ${this.currentLines.length.toLocaleString()} (berisi KRHRED: ${entries.length.toLocaleString()})`;
      }

      // Remove loading state
      modalContent.classList.remove('loading');

      // Render results
      this.renderSearchResults(entries, q);
    });
  }

  async renderSearchResults(entries, q) {
    if (!entries.length){
      this.rowsEl.innerHTML = `<div class="muted">Tidak ada KRHRED untuk filter ini.</div>`;
      return;
    }

    // Group entries by the code (first part before |)
    const codeGroups = new Map();
    
    if (q) {
      // Find all unique codes for matching emails
      const { emailIdx } = this.schema;
      
      for (const line of this.currentLines) {
        const parts = line.split('|');
        const email = (parts[emailIdx]||'').trim().toLowerCase();
        const code = parts[0] || '';
        
        if (email.includes(q)) {
          if (!codeGroups.has(code)) {
            codeGroups.set(code, {
              email: email,
              entries: []
            });
          }
        }
      }
      
      // Now add all KRHRED entries for each code
      const { unitIdx, textIdx } = this.schema;
      
      for (const code of codeGroups.keys()) {
        for (const line of this.currentLines) {
          const parts = line.split('|');
          const lineCode = parts[0] || '';
          const unit = (parts[unitIdx]||'').trim();
          const text = (parts[textIdx]||'').trim();
          
          if (lineCode === code && unitRegex.test(unit)) {
            const normalizedUnit = unit.replace(/^krhred(?:_unit)?_/i, 'KRHRED_Unit_');
            codeGroups.get(code).entries.push({
              unit: normalizedUnit,
              text: text
            });
          }
        }
      }
    } else {
      // No email search, show all entries grouped by unit
      const unitGroups = new Map();
      for (const entry of entries) {
        if (!unitGroups.has(entry.unit)) {
          unitGroups.set(entry.unit, []);
        }
        unitGroups.get(entry.unit).push(entry);
      }
      
      // Convert to codeGroups format for rendering
      for (const [unit, unitEntries] of unitGroups) {
        codeGroups.set(`|${unit}|`, {
          email: '',
          entries: unitEntries
        });
      }
    }

    const frag = document.createDocumentFragment();
    
    // Render each code group
    for (const [code, group] of codeGroups) {
      if (group.entries.length === 0) continue;
      
      // Create group container
      const groupDiv = document.createElement('div');
      groupDiv.className = 'email-group';
      
      // Add email header if exists
      if (group.email) {
        const emailRow = document.createElement('div');
        emailRow.className = 'krhred-row email-row';
        emailRow.innerHTML = `<code>email:</code><input type="email" class="input" value="${escapeHtml(group.email)}" readonly>`;
        groupDiv.appendChild(emailRow);
        
        // Add code row
        const codeRow = document.createElement('div');
        codeRow.className = 'krhred-row';
        codeRow.innerHTML = `<code>code:</code><input type="text" class="input" value="${escapeHtml(code)}" readonly>`;
        groupDiv.appendChild(codeRow);
      }
      
      // Add entries for this group
      const toRender = group.entries.slice(0, MAX_RENDER_ROWS);
      for (const e of toRender){
        const row = document.createElement('div');
        row.className = 'krhred-row';
        row.innerHTML = `<code>attr:${e.unit}</code><textarea class="input value${e.text.length > 60 ? ' value-long' : ''}" data-unit="${e.unit}" readonly>${escapeHtml(e.text)}</textarea>`;
        groupDiv.appendChild(row);
      }
      
      // Add copy button for this group
      const copyBtnRow = document.createElement('div');
      copyBtnRow.className = 'krhred-row copy-row';
      copyBtnRow.innerHTML = `<button class="copy-group-btn" data-code="${escapeHtml(code)}" onclick="app.copyGroupData('${escapeHtml(code)}')"><i class="fa-solid fa-copy"></i> Copy</button>`;
      groupDiv.appendChild(copyBtnRow);
      
      frag.appendChild(groupDiv);
    }
    
    this.rowsEl.appendChild(frag);

    if (entries.length > MAX_RENDER_ROWS){
      const more = document.createElement('div');
      more.className = 'muted';
      more.style.marginTop = '8px';
      more.textContent = `Showing ${MAX_RENDER_ROWS.toLocaleString()} of ${entries.toLocaleString()} entries. Refine email filter to narrow results.`;
      this.rowsEl.appendChild(more);
    }
  }

  copyGroupData(code) {
    // Find the group element
    const groupDiv = document.querySelector(`[data-code="${code}"]`).closest('.email-group');
    if (!groupDiv) {
      this.showToast('Group not found', 'error');
      return;
    }

    // Get email and code from the group
    const emailInput = groupDiv.querySelector('.email-row input');
    const codeInput = groupDiv.querySelector('.krhred-row:not(.email-row):not(.copy-row) input');
    const textareas = groupDiv.querySelectorAll('textarea[data-unit]');
    
    // Format the results
    let copyText = '';
    
    // Add email if exists
    if (emailInput && emailInput.value) {
      copyText += `email:\n${emailInput.value}\n`;
    }
    
    // Add code if exists
    if (codeInput && codeInput.value) {
      copyText += `code:\n${codeInput.value}\n`;
    }
    
    // Add all KRHRED attributes
    for (const textarea of textareas) {
      const unit = textarea.getAttribute('data-unit');
      const value = textarea.value;
      copyText += `attr:${unit}:\n${value}\n`;
    }

    // Copy to clipboard
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(copyText).then(() => {
        const btn = groupDiv.querySelector('.copy-group-btn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        btn.classList.add('copied');
        
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.classList.remove('copied');
        }, 2000);
        
        this.showToast('Copied to clipboard!', 'success');
      }).catch(err => {
        console.error('Failed to copy:', err);
        this.fallbackCopyToClipboard(copyText);
      });
    } else {
      this.fallbackCopyToClipboard(copyText);
    }
  }

  copyDatabaseResults(){
    const emailInput = this.rowsEl.querySelector('.email-row input');
    const inputs = this.rowsEl.querySelectorAll('textarea[data-unit]');
    
    if (!emailInput && !inputs.length){
      this.showToast('No results to copy', 'warning');
      return;
    }

    // Format the results as requested
    let copyText = '';
    
    // Add email first if exists
    if (emailInput && emailInput.value){
      copyText += `email:\n${emailInput.value}\n`;
    }
    
    // Add all KRHRED attributes
    for (const input of inputs){
      const unit = input.getAttribute('data-unit');
      const value = input.value;
      copyText += `attr:${unit}:\n${value}\n`;
    }

    // Copy to clipboard
    if (navigator.clipboard && window.isSecureContext){
      navigator.clipboard.writeText(copyText).then(() => {
        const count = inputs.length + (emailInput && emailInput.value ? 1 : 0);
        this.showToast(`Copied ${count} entries to clipboard!`, 'success');
        
        // Visual feedback on button
        const btn = document.getElementById('copyDatabaseBtn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i><span>Copied!</span>';
        btn.classList.add('copied');
        
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.classList.remove('copied');
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
        this.fallbackCopyToClipboard(copyText);
      });
    } else {
      this.fallbackCopyToClipboard(copyText);
    }
  }

  fallbackCopyToClipboard(text){
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      const count = inputs.length + (emailInput && emailInput.value ? 1 : 0);
      this.showToast(`Copied ${count} entries to clipboard!`, 'success');
      
      // Visual feedback on button
      const btn = document.getElementById('copyDatabaseBtn');
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i><span>Copied!</span>';
      btn.classList.add('copied');
      
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove('copied');
      }, 2000);
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      this.showToast('Failed to copy to clipboard', 'error');
    }
    
    document.body.removeChild(textArea);
  }

  showToast(message, type = 'info'){
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      animation: slideInRight 0.3s ease;
      font-weight: 500;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  async readPackageFiles(packageInfo) {
    const files = {};
    const packageFiles = [];

    for (const type of PACKAGE_FILE_TYPES) {
      const handle = packageInfo.files.get(type);
      if (!handle) continue;

      const file = await handle.getFile();
      packageFiles.push({ type, file });
    }

    const totalBytes = packageFiles.reduce((total, item) => total + item.file.size, 0);
    let loadedBytes = 0;

    for (const { type, file } of packageFiles) {
      const lines = await this.readLinesFromFile(file, (fileLoaded, previousFileLoaded) => {
        loadedBytes += fileLoaded - previousFileLoaded;
        this.updatePercent(loadedBytes, totalBytes, `Reading ${type}...`);
      });

      files[type] = {
        type,
        name: file.name,
        size: file.size,
        lines
      };
    }

    return files;
  }

  async readLinesFromFile(file, onProgress) {
    const reader = file.stream().getReader();
    const decoder = new TextDecoder();
    const lines = [];
    let buffer = '';
    let previousLoaded = 0;
    let loaded = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        loaded += value.byteLength;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex).replace(/\r$/, '');
          lines.push(line);
          buffer = buffer.slice(newlineIndex + 1);
          newlineIndex = buffer.indexOf('\n');
        }

        if (onProgress) onProgress(loaded, previousLoaded);
        previousLoaded = loaded;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      buffer += decoder.decode();
      const finalLine = buffer.replace(/\r$/, '');
      if (finalLine !== '') lines.push(finalLine);
    } finally {
      reader.releaseLock();
    }

    return lines;
  }

  parsePackageFile(file, expectedFields, findings) {
    if (!file) return [];

    const records = [];
    file.lines.forEach((line, index) => {
      const lineNumber = index + 1;
      if (line === '') {
        findings.push(this.createFinding('Malformed Row', file.type, lineNumber, '', 'Blank row is not allowed.'));
        return;
      }

      const fields = line.split('|');
      const id = (fields[0] || '').trim();
      const email = (fields[1] || '').trim();

      if (fields.length !== expectedFields) {
        findings.push(this.createFinding(
          'Invalid Format',
          file.type,
          lineNumber,
          id,
          `Expected ${expectedFields} fields including the trailing empty field.`,
          expectedFields,
          fields.length
        ));
      }

      if (!line.endsWith('|')) {
        findings.push(this.createFinding('Invalid Format', file.type, lineNumber, id, 'Row must end with a pipe delimiter.'));
      }

      if (!id) {
        findings.push(this.createFinding('Missing Required Fields', file.type, lineNumber, '', 'Customer ID is empty.'));
      }
      if (!email) {
        findings.push(this.createFinding('Missing Required Fields', file.type, lineNumber, id, 'Email is empty.'));
      } else if (!EMAIL_REGEX.test(email)) {
        findings.push(this.createFinding('Invalid Email', file.type, lineNumber, id, `Invalid email: ${email}`));
      }

      const idMatch = id.match(/^(.*)-(\d{6})$/);
      if (id && !idMatch) {
        findings.push(this.createFinding(
          'Invalid Customer ID',
          file.type,
          lineNumber,
          id,
          'Customer ID must end with a six-digit sequence.'
        ));
      }

      records.push({
        file: file.type,
        lineNumber,
        id,
        email,
        attribute: fields[2] || '',
        valueRaw: fields[3] || '',
        campaignId: idMatch ? idMatch[1] : ''
      });
    });

    return records;
  }

  createFinding(category, file, lineNumber, customerId, message, expected = '', actual = '') {
    return { category, file, lineNumber, customerId, message, expected, actual };
  }

  describeInvalidKrhredValue(valueRaw) {
    const value = valueRaw.trim();
    const reasons = [];

    if (!value) reasons.push('value is empty');
    if (value === '.') reasons.push('value only contains a dot');
    if (valueRaw !== value) reasons.push('value contains leading or trailing whitespace');
    if (value.includes('  ')) reasons.push('value contains repeated spaces');

    const visibleValue = valueRaw === ''
      ? '(empty)'
      : valueRaw
        .replace(/\t/g, '⇥')
        .replace(/ /g, '·')
        .slice(0, 120);

    return {
      reasons,
      actual: valueRaw.length > 120 ? `${visibleValue}…` : visibleValue
    };
  }

  createFindingsCollector() {
    const findings = [];
    findings.totalCount = 0;
    findings.fileCounts = new Map();
    findings.push = function (...items) {
      items.forEach((finding) => {
        this.totalCount += 1;
        this.fileCounts.set(finding.file, (this.fileCounts.get(finding.file) || 0) + 1);
        if (this.length < MAX_STORED_PACKAGE_FINDINGS) {
          Array.prototype.push.call(this, finding);
        }
      });
      return this.length;
    };
    return findings;
  }

  addDuplicateFindings(records, keyBuilder, label, findings) {
    const seen = new Map();

    records.forEach((record) => {
      const key = keyBuilder(record);
      if (!key) return;
      if (seen.has(key)) {
        findings.push(this.createFinding(
          'Duplicate Record',
          record.file,
          record.lineNumber,
          record.id,
          `Duplicate ${label}; first found on line ${seen.get(key)}.`
        ));
      } else {
        seen.set(key, record.lineNumber);
      }
    });
  }

  validateDatabasePackage(files, packageInfo) {
    const findings = this.createFindingsCollector();

    PACKAGE_FILE_TYPES.forEach((type) => {
      if (!files[type]) {
        findings.push(this.createFinding('Missing File', type, 0, '', `${type}.txt is missing from this package.`));
      }
    });

    const records = {
      CustMast: this.parsePackageFile(files.CustMast, 20, findings),
      CustPref: this.parsePackageFile(files.CustPref, 5, findings),
      CustSubs: this.parsePackageFile(files.CustSubs, 5, findings),
      CustAttr: this.parsePackageFile(files.CustAttr, 5, findings)
    };

    this.addDuplicateFindings(records.CustMast, (row) => row.id, 'customer ID', findings);
    this.addDuplicateFindings(records.CustPref, (row) => row.id, 'customer ID', findings);
    this.addDuplicateFindings(records.CustSubs, (row) => row.id, 'customer ID', findings);
    this.addDuplicateFindings(
      records.CustAttr,
      (row) => `${row.id}\u0000${row.attribute.trim().toUpperCase()}`,
      'customer attribute',
      findings
    );

    const attrTypes = new Set(records.CustAttr.map((row) => row.attribute.trim()).filter(Boolean));
    const dynamicUnits = [...attrTypes].filter((type) => unitRegex.test(type));
    const databaseType = dynamicUnits.length ? 'Dynamic' : 'Static';

    records.CustPref.forEach((row) => {
      const attribute = row.attribute.trim();
      const value = row.valueRaw.trim();
      if (attribute !== 'CMPG_ID') {
        findings.push(this.createFinding('Invalid Preference', row.file, row.lineNumber, row.id, 'CustPref attribute must be CMPG_ID.', 'CMPG_ID', attribute));
      }
      if (row.campaignId && value !== row.campaignId) {
        findings.push(this.createFinding('Campaign Mismatch', row.file, row.lineNumber, row.id, 'CMPG_ID does not match the customer ID prefix.', row.campaignId, value));
      }
    });

    records.CustSubs.forEach((row) => {
      const subscription = row.attribute.trim();
      const status = row.valueRaw.trim();
      if (!subscription) {
        findings.push(this.createFinding('Invalid Subscription', row.file, row.lineNumber, row.id, 'Subscription name is empty.'));
      }
      if (status !== 'Y') {
        findings.push(this.createFinding('Invalid Subscription', row.file, row.lineNumber, row.id, 'Subscription status must be Y.', 'Y', status));
      }
    });

    const attrById = new Map();
    records.CustAttr.forEach((row) => {
      const attribute = row.attribute.trim();
      const valueRaw = row.valueRaw;
      const value = valueRaw.trim();

      if (!attrById.has(row.id)) attrById.set(row.id, new Set());
      attrById.get(row.id).add(attribute);

      if (attribute === 'CMPG_ID') {
        if (row.campaignId && value !== row.campaignId) {
          findings.push(this.createFinding('Campaign Mismatch', row.file, row.lineNumber, row.id, 'CMPG_ID does not match the customer ID prefix.', row.campaignId, value));
        }
        return;
      }

      if (databaseType === 'Static') {
        findings.push(this.createFinding('Unexpected Attribute', row.file, row.lineNumber, row.id, `Static database cannot contain ${attribute || 'an empty attribute'}.`));
        return;
      }

      if (!unitRegex.test(attribute)) {
        findings.push(this.createFinding('Invalid KRHRED Format', row.file, row.lineNumber, row.id, `Invalid KRHRED attribute: ${attribute || '(empty)'}`));
      }
      const invalidValue = this.describeInvalidKrhredValue(valueRaw);
      if (invalidValue.reasons.length) {
        findings.push(this.createFinding(
          'Invalid KRHRED Data',
          row.file,
          row.lineNumber,
          row.id,
          `${attribute || 'KRHRED attribute'}: ${invalidValue.reasons.join('; ')}.`,
          'Non-empty text without dot-only values, outer whitespace, or repeated spaces',
          invalidValue.actual
        ));
      }
      if (value.length > 60) {
        findings.push(this.createFinding('KRHRED Too Long', row.file, row.lineNumber, row.id, `${attribute} contains ${value.length} characters.`, '60 or fewer', value.length));
      }
    });

    const mastById = new Map(records.CustMast.filter((row) => row.id).map((row) => [row.id, row]));
    const baselineIds = [...mastById.keys()];

    ['CustPref', 'CustSubs', 'CustAttr'].forEach((type) => {
      const rows = records[type];
      const rowsById = new Map();
      rows.forEach((row) => {
        if (!rowsById.has(row.id)) rowsById.set(row.id, []);
        rowsById.get(row.id).push(row);
      });

      baselineIds.forEach((id) => {
        const relatedRows = rowsById.get(id);
        if (!relatedRows?.length) {
          findings.push(this.createFinding('Missing Customer', type, 0, id, `${id} exists in CustMast but is missing from ${type}.`));
          return;
        }

        relatedRows.forEach((row) => {
          const expectedEmail = mastById.get(id).email;
          if (row.email !== expectedEmail) {
            findings.push(this.createFinding('Email Mismatch', type, row.lineNumber, id, 'Email does not match CustMast.', expectedEmail, row.email));
          }
        });
      });

      rowsById.forEach((relatedRows, id) => {
        if (id && !mastById.has(id)) {
          const row = relatedRows[0];
          findings.push(this.createFinding('Extra Customer', type, row.lineNumber, id, `${id} does not exist in CustMast.`));
        }
      });
    });

    baselineIds.forEach((id) => {
      const attributes = attrById.get(id);
      if (!attributes) return;

      if (!attributes.has('CMPG_ID')) {
        findings.push(this.createFinding('Missing Attribute', 'CustAttr', 0, id, 'CMPG_ID attribute is missing.'));
      }
      if (databaseType === 'Dynamic') {
        dynamicUnits.forEach((unit) => {
          if (!attributes.has(unit)) {
            findings.push(this.createFinding('Missing Attribute', 'CustAttr', 0, id, `${unit} is missing.`));
          }
        });
      }
    });

    const fileStats = PACKAGE_FILE_TYPES.map((type) => ({
      type,
      present: Boolean(files[type]),
      rows: records[type].length,
      errors: findings.fileCounts.get(type) || 0
    }));

    return {
      packageName: packageInfo.key,
      databaseType,
      customerCount: mastById.size,
      findings,
      findingCount: findings.totalCount,
      findingsTruncated: findings.totalCount > findings.length,
      fileStats,
      dynamicUnits: dynamicUnits.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    };
  }

  async checkDatabasePackage() {
    if (!this.selectedPackage) {
      alert('Please select a database package first.');
      return;
    }

    const packageInfo = this.selectedPackage;
    const packageKey = packageInfo.key;
    const validationToken = ++this.packageValidationToken;

    this.isChecking = true;
    this.updateCheckButton();
    this.showLoading(true, 'Checking database package...');

    try {
      const files = await this.readPackageFiles(packageInfo);
      const result = this.validateDatabasePackage(files, packageInfo);

      if (validationToken !== this.packageValidationToken || this.selectedPackageKey !== packageKey) {
        return;
      }

      this.lastPackageResult = result;
      this.renderPackageResults(result);
      this.updatePackageStatus(result);
    } catch (error) {
      console.error('Package validation failed:', error);
      this.showToast(`Package validation failed: ${error.message}`, 'error');
    } finally {
      if (validationToken === this.packageValidationToken) {
        this.isChecking = false;
        this.updateCheckButton();
        this.showLoading(false);
      }
    }
  }

  updatePackageStatus(result = null) {
    const status = document.getElementById('packageStatus');
    if (!status) return;

    if (result) {
      const valid = result.findingCount === 0;
      status.className = `package-status ${valid ? 'valid' : 'invalid'}`;
      status.textContent = `${result.databaseType} Database · ${valid ? 'Valid' : `${result.findingCount} invalid`}`;
      return;
    }

    if (this.selectedPackage) {
      const present = PACKAGE_FILE_TYPES.filter((type) => this.selectedPackage.files.has(type)).length;
      status.className = `package-status ${present === 4 ? 'ready' : 'invalid'}`;
      status.textContent = `${this.selectedPackage.key} · ${present}/4 files`;
    } else {
      status.className = 'package-status';
      status.textContent = 'No database package selected';
    }
  }

  renderPackageResults(result) {
    const container = document.getElementById('resultsContainer');
    if (!container) return;

    const valid = result.findingCount === 0;
    const fileCards = result.fileStats.map((file) => `
      <div class="package-file-card ${file.present && !file.errors ? 'valid' : 'invalid'}">
        <div>
          <strong>${escapeHtml(file.type)}</strong>
          <span>${file.present ? `${file.rows.toLocaleString()} rows` : 'Missing file'}</span>
        </div>
        <span class="package-file-state">${file.present && !file.errors ? 'Valid' : `${file.errors} invalid`}</span>
      </div>
    `).join('');

    container.innerHTML = `
      <section class="package-results">
        <header class="package-summary ${valid ? 'valid' : 'invalid'}">
          <div>
            <span class="package-type">${escapeHtml(result.databaseType)} Database</span>
            <h4>${valid ? 'Package is valid' : `${result.findingCount} invalid finding${result.findingCount === 1 ? '' : 's'}`}</h4>
            <p>${result.customerCount.toLocaleString()} customers · ${escapeHtml(result.packageName)}</p>
          </div>
          <i class="fa-solid ${valid ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i>
        </header>
        <div class="package-file-grid">${fileCards}</div>
        ${result.databaseType === 'Dynamic' && result.dynamicUnits.length ? `
          <div class="package-units"><strong>KRHRED Units</strong>${result.dynamicUnits.map((unit) => `<span>${escapeHtml(unit)}</span>`).join('')}</div>
        ` : ''}
        <div class="package-findings"></div>
      </section>
    `;

    const findingsContainer = container.querySelector('.package-findings');
    if (valid) {
      findingsContainer.innerHTML = `
        <div class="package-valid-state">
          <i class="fa-solid fa-circle-check"></i>
          <strong>All four files are consistent.</strong>
          <span>No invalid records were found.</span>
        </div>
      `;
      return;
    }

    this.renderPackageFindingBatch(result, findingsContainer, 0);
  }

  renderPackageFindingBatch(result, container, startIndex) {
    const oldControls = container.querySelector('.package-findings-controls');
    if (oldControls) oldControls.remove();

    const endIndex = Math.min(startIndex + PACKAGE_FINDINGS_BATCH_SIZE, result.findings.length);
    const batchHtml = result.findings.slice(startIndex, endIndex).map((finding) => `
      <article class="package-finding">
        <div class="package-finding-head">
          <strong>${escapeHtml(finding.category)}</strong>
          <span>${escapeHtml(finding.file)}${finding.lineNumber ? ` · Line ${finding.lineNumber}` : ''}</span>
        </div>
        <p>${escapeHtml(finding.message)}</p>
        ${finding.expected !== '' || finding.actual !== '' ? `
          <div class="package-expected">
            <span><b>Expected:</b> ${escapeHtml(String(finding.expected))}</span>
            <span><b>Actual:</b> ${escapeHtml(String(finding.actual))}</span>
          </div>
        ` : ''}
      </article>
    `).join('');

    container.insertAdjacentHTML('beforeend', batchHtml);

    if (endIndex < result.findingCount) {
      const controls = document.createElement('div');
      controls.className = 'package-findings-controls';

      const status = document.createElement('span');
      status.textContent = endIndex < result.findings.length
        ? `Showing ${endIndex.toLocaleString()} of ${result.findingCount.toLocaleString()} findings`
        : `Showing the first ${result.findings.length.toLocaleString()} of ${result.findingCount.toLocaleString()} findings`;
      controls.appendChild(status);

      if (endIndex < result.findings.length) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-secondary';
        button.innerHTML = '<i class="fa-solid fa-plus"></i><span>Load more</span>';
        button.addEventListener('click', () => {
          this.renderPackageFindingBatch(result, container, endIndex);
        });
        controls.appendChild(button);
      }

      container.appendChild(controls);
    }
  }

  /* ========= Check database (optimized with full validation) ===== */
  async checkDatabase(){
    if (this.selectedPackage) {
      await this.checkDatabasePackage();
      return;
    }

    if (!this.currentLines.length){ alert('Please load a file first'); return; }
    this.isChecking = true; 
    this.updateCheckButton(); 
    this.showLoading(true, 'Validating database...');

    const unitsSet = new Set();
    const emptyDataUnits = new Set();
    const invalidFormatUnits = new Set(); // Unit dengan format tidak valid
    const invalidEmailUnits = new Set(); // Unit dengan email tidak valid
    const longDataUnits = new Set(); // Unit dengan data terlalu panjang
    const missingFieldUnits = new Set(); // Unit dengan field kosong
    const unitDetails = new Map();
    
    // Adaptive chunk size based on dataset size
    const totalLines = this.currentLines.length;
    let chunkSize = 1000;
    if (totalLines > 1000000) {
      chunkSize = 5000; // Larger chunks for very large datasets
    } else if (totalLines > 100000) {
      chunkSize = 2000; // Medium chunks for large datasets
    }
    
    this._stopRequested = false;
    
    // Performance tracking
    const startTime = performance.now();
    let lastUpdate = 0;
    let processedLines = 0;

    // Use Web Worker for validation if available and dataset is large
    if (this.worker && totalLines > 50000) {
      console.log('\ud83d\udd0d Using Web Worker for validation');
      await this.validateWithWorker(unitsSet, emptyDataUnits, 
                                   invalidFormatUnits, invalidEmailUnits, 
                                   longDataUnits, missingFieldUnits, unitDetails);
    } else {
      console.log(`\ud83d\udd0d Using main thread for validation with chunk size: ${chunkSize}`);
      
      for (let i=0;i<this.currentLines.length;i+=chunkSize){
        if (this._stopRequested) break;
        const chunk = this.currentLines.slice(i, Math.min(i+chunkSize, this.currentLines.length));

        // Process chunk with optimized validation
        this.processValidationChunk(chunk, i, unitsSet, emptyDataUnits,
                                   invalidFormatUnits, invalidEmailUnits, longDataUnits,
                                   missingFieldUnits, unitDetails);
        
        processedLines += chunk.length;

        // Update progress with throttling for better performance
        const now = performance.now();
        if (now - lastUpdate > 100 || i + chunkSize >= this.currentLines.length) { // Update every 100ms
          const progress = Math.min(i + chunkSize, this.currentLines.length);
          this.updatePercent(progress, this.currentLines.length, 
                            `Validating... ${progress.toLocaleString()} rows`);
          lastUpdate = now;
          
          // Yield to browser less frequently for better performance
          await new Promise(r=>setTimeout(r, 0));
        }
      }
    }
    
    // Performance logging
    const endTime = performance.now();
    console.log(`Validation completed in ${(endTime - startTime).toFixed(2)}ms`);

    // Combine all errors
    const allErrorUnits = new Set([...emptyDataUnits, ...invalidFormatUnits, ...invalidEmailUnits, ...longDataUnits, ...missingFieldUnits]);
    
    // Render results with requestAnimationFrame for non-blocking UI
    requestAnimationFrame(() => {
      this.renderResults(unitsSet, allErrorUnits, unitDetails);
    });
    
    // Show completion message
    this.updatePercent(this.currentLines.length, this.currentLines.length, 'Validation complete!');
    
    setTimeout(() => {
      this.showLoading(false); 
      this.isChecking = false; 
      this.updateCheckButton();
    }, 1500); // Keep the completion message visible for 1.5 seconds
  }

  // Optimized chunk processing method
  processValidationChunk(chunk, startIndex, unitsSet, emptyDataUnits,
                         invalidFormatUnits, invalidEmailUnits, longDataUnits,
                         missingFieldUnits, unitDetails) {
    for (let j = 0; j < chunk.length; j++) {
      const line = chunk[j];
      const lineNumber = startIndex + j + 1;
      
      // Quick check for minimum required structure
      const firstPipe = line.indexOf('|');
      if (firstPipe === -1) continue;
      
      // Extract parts more efficiently
      const parts = line.split('|');
      if (parts.length < 4) continue;
      
      const id = parts[0].trim();
      const email = parts[1].trim();
      const type = parts[2].trim();
      const dataRaw = parts[3];
      const data = dataRaw.trim();

      // Check missing required fields
      if (!id || !email || !type) {
        const missingFields = [];
        if (!id) missingFields.push('ID');
        if (!email) missingFields.push('Email');
        if (!type) missingFields.push('Type');
        
        missingFieldUnits.add(type || 'UNKNOWN');
        if (!unitDetails.has(type || 'UNKNOWN')) {
          unitDetails.set(type || 'UNKNOWN', []);
        }
        unitDetails.get(type || 'UNKNOWN').push({ 
          lineNumber, 
          lineText: line,
          error: `Missing fields: ${missingFields.join(', ')}`
        });
      }

      // Check if it's a KRHRED type (case-insensitive check)
      if (type.toLowerCase().startsWith('krhred')) {
        unitsSet.add(type);
        
        // Batch error checks for better performance
        const errors = [];
        
        // Check for empty data or trailing/leading spaces
        if (data === '' || dataRaw !== dataRaw.trim() || data === '.' || data.includes('  ')) {
          errors.push('Invalid data');
          emptyDataUnits.add(type);
        }
        
        // Check KRHRED format
        if (!unitRegex.test(type)) {
          errors.push('Invalid format');
          invalidFormatUnits.add(type);
        }
        
        // Check email format (only if email exists)
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email)) {
          errors.push('Invalid email');
          invalidEmailUnits.add(type);
        }
        
        // Check data length
        if (data.length > 60) {
          errors.push(`Data too long (${data.length})`);
          longDataUnits.add(type);
        }

        // Store error details if any errors found
        if (errors.length > 0) {
          if (!unitDetails.has(type)) {
            unitDetails.set(type, []);
          }
          unitDetails.get(type).push({ 
            lineNumber, 
            lineText: line,
            error: errors.join(', ')
          });
        }
      }
    }
  }

  // Web Worker validation for large datasets
  async validateWithWorker(unitsSet, emptyDataUnits,
                          invalidFormatUnits, invalidEmailUnits,
                          longDataUnits, missingFieldUnits, unitDetails) {
    return new Promise((resolve) => {
      // Create a new worker for validation
      const validationWorkerCode = `
        self.onmessage = function(e) {
          const { lines, unitRegex } = e.data;
          const results = {
            unitsSet: new Set(),
            emptyDataUnits: new Set(),
            invalidFormatUnits: new Set(),
            invalidEmailUnits: new Set(),
            longDataUnits: new Set(),
            missingFieldUnits: new Set(),
            unitDetails: new Map()
          };
          
          const regex = new RegExp(unitRegex);
          const totalLines = lines.length;
          const chunkSize = 50000;
          
          // Process in chunks and report progress
          for (let i = 0; i < totalLines; i += chunkSize) {
            const end = Math.min(i + chunkSize, totalLines);
            
            for (let j = i; j < end; j++) {
              const line = lines[j];
              const parts = line.split('|');
              if (parts.length < 4) continue;
              
              const id = parts[0].trim();
              const email = parts[1].trim();
              const type = parts[2].trim();
              const dataRaw = parts[3];
              const data = dataRaw.trim();
              
              // Same validation logic as main thread
              if (!id || !email || !type) {
                const missingFields = [];
                if (!id) missingFields.push('ID');
                if (!email) missingFields.push('Email');
                if (!type) missingFields.push('Type');
                
                results.missingFieldUnits.add(type || 'UNKNOWN');
                if (!results.unitDetails.has(type || 'UNKNOWN')) {
                  results.unitDetails.set(type || 'UNKNOWN', []);
                }
                results.unitDetails.get(type || 'UNKNOWN').push({ 
                  lineNumber: j + 1, 
                  lineText: line,
                  error: 'Missing fields: ' + missingFields.join(', ')
                });
              }
              
              if (type.toLowerCase().startsWith('krhred')) {
                results.unitsSet.add(type);
                const errors = [];
                
                if (data === '' || dataRaw !== dataRaw.trim() || data === '.' || data.includes('  ')) {
                  errors.push('Invalid data');
                  results.emptyDataUnits.add(type);
                }
                
                if (!regex.test(type)) {
                  errors.push('Invalid format');
                  results.invalidFormatUnits.add(type);
                }
                
                if (data.length > 60) {
                  errors.push('Data too long (' + data.length + ')');
                  results.longDataUnits.add(type);
                }

                // Store error details if any errors found
                if (errors.length > 0) {
                  if (!results.unitDetails.has(type)) {
                    results.unitDetails.set(type, []);
                  }
                  results.unitDetails.get(type).push({ 
                    lineNumber: j + 1, 
                    lineText: line,
                    error: errors.join(', ')
                  });
                }
              }
            }
            
            // Report progress
            self.postMessage({
              type: 'progress',
              progress: end,
              total: totalLines
            });
          }
          
          // Send final results
          self.postMessage({
            type: 'complete',
            unitsSet: Array.from(results.unitsSet),
            emptyDataUnits: Array.from(results.emptyDataUnits),
            invalidFormatUnits: Array.from(results.invalidFormatUnits),
            invalidEmailUnits: Array.from(results.invalidEmailUnits),
            longDataUnits: Array.from(results.longDataUnits),
            missingFieldUnits: Array.from(results.missingFieldUnits),
            unitDetails: Array.from(results.unitDetails.entries())
          });
        };
      `;
      
      const blob = new Blob([validationWorkerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      
      worker.onmessage = (e) => {
        const data = e.data;
        
        if (data.type === 'progress') {
          // Update progress
          this.updatePercent(data.progress, data.total, 
                            `Validating... ${data.progress.toLocaleString()} rows`);
        } else if (data.type === 'complete') {
          // Convert back to Sets and Maps
          data.unitsSet.forEach(u => unitsSet.add(u));
          data.emptyDataUnits.forEach(u => emptyDataUnits.add(u));
          data.invalidFormatUnits.forEach(u => invalidFormatUnits.add(u));
          data.invalidEmailUnits.forEach(u => invalidEmailUnits.add(u));
          data.longDataUnits.forEach(u => longDataUnits.add(u));
          data.missingFieldUnits.forEach(u => missingFieldUnits.add(u));
          data.unitDetails.forEach(([k, v]) => {
            unitDetails.set(k, v);
          });
          
          worker.terminate();
          resolve();
        }
      };
      
      // Send the lines to worker
      worker.postMessage({
        lines: this.currentLines,
        unitRegex: unitRegex.source
      });
    });
  }

  stopChecking(){
    this._stopRequested = true;
    this.isChecking = false;
    this.updateCheckButton();
    this.showLoading(false);
  }

  updateCheckButton(){
    if (this.isChecking){
      this.checkBtn.innerHTML = `<i class="fa-solid fa-stop"></i><span>Stop</span>`;
      this.checkBtn.classList.add('btn-danger');
      this.checkBtn.classList.remove('btn-primary');
    } else {
      this.checkBtn.innerHTML = `<i class="fa-solid fa-list-check"></i><span>Check Database Package</span>`;
      this.checkBtn.classList.remove('btn-danger');
      this.checkBtn.classList.add('btn-primary');
    }
  }
  showLoading(show, message = 'Processing...'){
    const wrap = document.getElementById('loadingWrapper');
    const indicator = document.getElementById('loadingIndicator');
    const progressText = document.getElementById('progressText');
    
    if (wrap){
      if (show) {
        wrap.style.visibility = 'visible';
        wrap.style.opacity = '1';
        indicator.textContent = message;
        progressText.textContent = '0%';
        
        // Add pulse animation
        indicator.classList.add('pulse');
      } else {
        // Fade out effect
        wrap.style.opacity = '0';
        setTimeout(() => {
          if (!this.isChecking) {
            wrap.style.visibility = 'hidden';
          }
        }, 300);
        
        // Remove pulse animation
        indicator.classList.remove('pulse');
      }
    }
  }
  updatePercent(current, total, message = null){
    const percent = (current/total)*100;
    const wrap = document.getElementById('loadingWrapper');
    const indicator = document.getElementById('loadingIndicator');
    const progressText = document.getElementById('progressText');
    
    if (wrap && wrap.style.visibility !== 'hidden'){
      wrap.style.visibility = 'visible';
      wrap.style.opacity = '1';
      progressText.textContent = `${Math.round(percent)}%`;
      
      // Update message if provided
      if (message) {
        indicator.textContent = message;
      }
      
      // Add completion effect
      if (percent >= 100) {
        indicator.classList.add('complete');
        progressText.textContent = 'Complete!';
        setTimeout(() => {
          indicator.classList.remove('complete');
        }, 1000);
      }
    }
  }

  /* ===== Folder & file ===== */
  async openFolder(){
    try{
      const dirHandle = await window.showDirectoryPicker();
      this.showLoading(true, 'Scanning database packages...');
      await this.buildFileTree(dirHandle);
    } catch(err){
      if (err.name === 'AbortError') {
        // User cancelled the dialog - don't show an error
        console.log('Folder selection cancelled by user');
      } else if (err.name === 'NotAllowedError') {
        alert('Permission denied. Please allow access to select a folder.');
      } else if (err.name === 'NotFoundError') {
        alert('The selected folder was not found.');
      } else {
        console.error('Error opening folder:', err);
        alert('Error opening folder: ' + err.message);
      }
    } finally {
      this.showLoading(false);
    }
  }

  async buildFileTree(dirHandle, parentUl = document.querySelector('#fileList ul')){
    parentUl.innerHTML = '';
    this.databasePackages.clear();
    this.selectedPackageKey = '';
    this.selectedPackage = null;
    this.lastPackageResult = null;

    for await (const entry of dirHandle.values()) {
      if (entry.kind !== 'file') continue;
      const match = entry.name.match(PACKAGE_FILE_PATTERN);
      if (!match) continue;

      const key = match[1];
      const type = PACKAGE_FILE_TYPES.find((name) => name.toLowerCase() === match[2].toLowerCase());
      if (!this.databasePackages.has(key)) {
        this.databasePackages.set(key, { key, files: new Map() });
      }
      this.databasePackages.get(key).files.set(type, entry);
    }

    const packages = [...this.databasePackages.values()];
    for (const packageInfo of packages) {
      await this.scanPackageMetadata(packageInfo);
    }
    packages.sort((a, b) => {
      if (a.dateTimestamp !== b.dateTimestamp) return b.dateTimestamp - a.dateTimestamp;
      return b.key.localeCompare(a.key, undefined, { numeric: true });
    });
    const frag = document.createDocumentFragment();

    packages.forEach((packageInfo) => {
      const heading = document.createElement('li');
      const fileCount = PACKAGE_FILE_TYPES.filter((type) => packageInfo.files.has(type)).length;
      heading.className = `package-heading ${fileCount === PACKAGE_FILE_TYPES.length ? 'complete' : 'incomplete'}`;
      heading.innerHTML = `
        <span>${escapeHtml(packageInfo.key)}</span>
        <small>${fileCount}/4</small>
      `;
      heading.addEventListener('click', () => this.selectPackage(packageInfo.key));
      frag.appendChild(heading);
    });

    parentUl.appendChild(frag);

    if (!packages.length) {
      const empty = document.createElement('li');
      empty.className = 'package-empty';
      empty.textContent = 'No database package files found';
      parentUl.appendChild(empty);
      this.updatePackageStatus();
      return;
    }

    const initialPackage = packages.find((packageInfo) => packageInfo.files.size === 4) || packages[0];
    this.selectPackage(initialPackage.key);
  }

  async scanPackageMetadata(packageInfo) {
    packageInfo.date = this.extractPackageDate(packageInfo.key);
    packageInfo.dateTimestamp = packageInfo.date?.getTime() || 0;
    packageInfo.fileMetadata = new Map();
    packageInfo.totalSize = 0;
    packageInfo.databaseType = 'Unknown';
    packageInfo.dynamicUnits = [];

    for (const type of PACKAGE_FILE_TYPES) {
      const handle = packageInfo.files.get(type);
      if (!handle) continue;

      const file = await handle.getFile();
      packageInfo.fileMetadata.set(type, {
        name: file.name,
        size: file.size,
        lastModified: file.lastModified
      });
      packageInfo.totalSize += file.size;

      if (type === 'CustAttr') {
        const firstChunk = await file.slice(0, PACKAGE_TYPE_SCAN_BYTES).text();
        const tailStart = Math.max(0, file.size - PACKAGE_TYPE_SCAN_BYTES);
        const lastChunk = tailStart > 0
          ? await file.slice(tailStart, file.size).text()
          : '';
        const sample = `${firstChunk}\n${lastChunk}`;
        const units = [...sample.matchAll(/KRHRED(?:_Unit)?_\d+/gi)]
          .map((match) => match[0])
          .filter((unit, index, values) => values.indexOf(unit) === index)
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        packageInfo.dynamicUnits = units;
        packageInfo.databaseType = units.length ? 'Dynamic' : 'Static';
      }
    }
  }

  extractPackageDate(packageKey) {
    const match = packageKey.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const maximumYear = new Date().getFullYear() + 1;
    if (year < 2000 || year > maximumYear) return null;

    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year
      || date.getMonth() !== month - 1
      || date.getDate() !== day
    ) {
      return null;
    }
    return date;
  }

  formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / (1024 ** unitIndex);
    return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
  }

  async selectPackage(packageKey) {
    const packageInfo = this.databasePackages.get(packageKey);
    if (!packageInfo) return;

    this.packageValidationToken += 1;
    this.isChecking = false;
    this.selectedPackageKey = packageKey;
    this.selectedPackage = packageInfo;
    this.lastPackageResult = null;
    this.checkBtn.disabled = false;
    this.updateCheckButton();
    this.showLoading(false);

    document.querySelectorAll('#fileList .package-heading').forEach((heading) => {
      heading.classList.toggle('active', heading.querySelector('span')?.textContent === packageKey);
    });
    const currentPath = document.getElementById('currentPath');
    if (currentPath) currentPath.textContent = packageKey;

    this.resetPackageResults(packageInfo);
    this.updatePackageStatus();
    this.renderPackageOverview(packageInfo);
  }

  renderPackageOverview(packageInfo) {
    const container = document.getElementById('databaseContent');
    const searchButton = document.getElementById('openSearchModalBtn');
    if (searchButton) searchButton.disabled = true;
    if (!container) return;

    if (this.vs) {
      this.vs.destroy();
    }
    this.currentLines = [];
    this.processedLinesCount = 0;

    const dateLabel = packageInfo.date
      ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(packageInfo.date)
      : 'Date not detected';
    const fileCount = PACKAGE_FILE_TYPES.filter((type) => packageInfo.files.has(type)).length;
    const fileCards = PACKAGE_FILE_TYPES.map((type) => {
      const metadata = packageInfo.fileMetadata.get(type);
      return `
        <div class="overview-file ${metadata ? 'present' : 'missing'}">
          <span>${escapeHtml(type)}</span>
          <strong>${metadata ? this.formatFileSize(metadata.size) : 'Missing'}</strong>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <section class="package-overview">
        <div class="overview-hero">
          <span class="overview-type ${packageInfo.databaseType.toLowerCase()}">${escapeHtml(packageInfo.databaseType)} Database</span>
          <h4>${escapeHtml(packageInfo.key)}</h4>
          <p>${dateLabel}</p>
        </div>
        <div class="overview-stats">
          <div><span>Total databases</span><strong>${this.databasePackages.size}</strong></div>
          <div><span>Package size</span><strong>${this.formatFileSize(packageInfo.totalSize)}</strong></div>
          <div><span>Files ready</span><strong>${fileCount}/4</strong></div>
        </div>
        <div class="overview-files">${fileCards}</div>
        ${packageInfo.databaseType === 'Dynamic' && packageInfo.dynamicUnits.length ? `
          <div class="overview-units">
            <span>Detected KRHRED</span>
            <div>${packageInfo.dynamicUnits.map((unit) => `<code>${escapeHtml(unit)}</code>`).join('')}</div>
          </div>
        ` : ''}
        <p class="overview-note">Raw database lines are hidden from the main workspace. Run validation to inspect invalid records.</p>
      </section>
    `;

    const currentPath = document.getElementById('currentPath');
    if (currentPath) currentPath.textContent = packageInfo.key;
  }

  resetPackageResults(packageInfo) {
    const container = document.getElementById('resultsContainer');
    if (!container) return;

    const fileCount = PACKAGE_FILE_TYPES.filter((type) => packageInfo.files.has(type)).length;
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-list-check"></i>
        <p>${fileCount}/4 files ready. Check this package to view validation results.</p>
      </div>
    `;
  }

  clearResults(){
    document.getElementById('resultsContainer').innerHTML = '';
    const detailsDiv = document.getElementById('krhredDetails');
    if (detailsDiv) detailsDiv.innerHTML = '';
    document.getElementById('loadMoreBtn').style.display = 'none';
    
    // Clear data content
    const container = document.getElementById('databaseContent');
    container.innerHTML = '';
    
    // Add empty state back
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <i class="fa-solid fa-database"></i>
      <p>Open a database file to begin</p>
    `;
    container.appendChild(emptyState);
  }

  async loadFile(fileHandle){
    try{
      const loadStart = performance.now();
      console.log('\ud83d\udd0d File loading started');
      
      this.clearResults();
      this.showLoading(true);
      const file = await fileHandle.getFile();

      if (file.size > MAX_MEMORY_USAGE){
        const ok = confirm(`This file is large (${(file.size/1024/1024).toFixed(1)}MB). Continue?`);
        if (!ok){ this.showLoading(false); return; }
      }

      // Clear container completely
      const container = document.getElementById('databaseContent');
      container.innerHTML = '';
      
      // Reinitialize virtual scroller
      if (this.vs) {
        this.vs.destroy();
      }
      this.vs = new VirtualScroller(container);

      // Load file with optimized streaming
      const readStart = performance.now();
      this.currentLines = await this.fp.readFile(file, (loaded,total)=>this.updatePercent(loaded,total));
      console.log(`\u23f1\ufe0f File read completed in ${(performance.now() - readStart).toFixed(2)}ms: ${this.currentLines.length} lines`);
      
      // Load ALL lines by default, not just LINES_PER_PAGE
      this.processedLinesCount = this.currentLines.length;
      
      // Use requestAnimationFrame for non-blocking UI updates
      requestAnimationFrame(() => {
        const renderStart = performance.now();
        
        // Show all lines at once
        this.vs.setItems(this.currentLines);
        
        console.log(`\u23f1\ufe0f Initial render completed in ${(performance.now() - renderStart).toFixed(2)}ms`);
        
        // Force the container to update its scrollable area
        setTimeout(() => {
          // Ensure the scroll height is properly calculated
          const container = document.getElementById('databaseContent');
          if (container && container.scrollHeight > container.clientHeight) {
            // Container is scrollable, trigger a scroll to ensure proper rendering
            container.scrollTop = 0;
          }
          
          // Force a resize check after setting items
          if (this.vs.observer) {
            this.vs.observer.disconnect();
            this.vs.observer.observe(container);
            if (container.parentElement) {
              this.vs.observer.observe(container.parentElement);
            }
          }
        }, 100);
        
        // Hide load more button since all lines are loaded
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        
        // detect schema once file loaded
        this.detectSchema();
        
        // Update file path in breadcrumb
        const currentPath = document.getElementById('currentPath');
        if (currentPath) {
          currentPath.textContent = file.name;
        }
        
        // Enable buttons
        this.checkBtn.disabled = false;
        document.getElementById('openSearchModalBtn').disabled = false;
        
        console.log(`\u23f1\ufe0f Total file load time: ${(performance.now() - loadStart).toFixed(2)}ms`);
      });

    } catch(err){
      console.error('Error loading file:', err);
      alert('Error loading file: ' + err.message);
    } finally {
      this.showLoading(false);
    }
  }

  loadMore(){
    const next = this.currentLines.slice(this.processedLinesCount, this.processedLinesCount + window.LINES_PER_PAGE);
    if (next.length){
      // Remember current scroll position
      const container = this.vs.container;
      const wasAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
      
      // Show loading state on button
      const loadMoreBtn = document.getElementById('loadMoreBtn');
      loadMoreBtn.disabled = true;
      loadMoreBtn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>Loading...</span>
      `;
      
      this.processedLinesCount += next.length;
      
      // Use requestAnimationFrame for smoother UI updates
      requestAnimationFrame(() => {
        // Update items without clearing the view
        this.vs.setItems(this.currentLines.slice(0, this.processedLinesCount));
        
        // If user was at bottom, keep them at bottom
        if (wasAtBottom) {
          container.scrollTop = container.scrollHeight;
        }
        
        // Update button with new progress
        const totalLines = this.currentLines.length;
        if (this.processedLinesCount >= totalLines) {
          loadMoreBtn.style.display = 'none';
        } else {
          loadMoreBtn.disabled = false;
          loadMoreBtn.innerHTML = `
            <i class="fa-solid fa-angles-down"></i>
            <span>Load More (${this.processedLinesCount}/${totalLines})</span>
          `;
        }
      });
    }
  }

  renderResults(unitsSet, errorUnits, unitDetails){
    // Use requestAnimationFrame for non-blocking rendering
    requestAnimationFrame(() => {
      this.renderResultsAsync(unitsSet, errorUnits, unitDetails);
    });
  }
  
  async renderResultsAsync(unitsSet, errorUnits, unitDetails){
    const renderStart = performance.now();
    
    const resultsContainer = document.getElementById('resultsContainer');
    if (!resultsContainer) return;

    // Show loading state
    resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Rendering results...</div>';
    
    // Use Web Worker or async for counting
    const totalDB = this.worker && this.currentLines.length > 50000 
      ? await this.countUniqueCMPGIDsAsync(this.currentLines)
      : this.countUniqueCMPGIDs(this.currentLines);
    
    // Build summary first
    const summaryHtml = this.buildSummaryHtml(unitsSet, errorUnits, totalDB, unitDetails);
    
    // Update container with summary
    resultsContainer.innerHTML = summaryHtml;
    
    // Render error details in chunks if there are any
    if (errorUnits.size > 0) {
      // Add details container
      const detailsContainer = document.createElement('div');
      detailsContainer.className = 'results-details';
      detailsContainer.innerHTML = '<h4>Error Summary</h4>';
      resultsContainer.querySelector('.validation-results').appendChild(detailsContainer);
      
      // Render errors immediately
      await this.renderErrorsInBatches(detailsContainer, errorUnits, unitDetails);
    }
    
    // Update stats asynchronously
    requestAnimationFrame(() => {
      updateQuickStats();
    });
    
    console.log(`\u2705 renderResultsAsync completed in ${(performance.now() - renderStart).toFixed(2)}ms`);
  }
  
  buildSummaryHtml(unitsSet, errorUnits, totalDB, unitDetails) {
    let html = '<div class="validation-results">';
    
    // Determine database type
    const hasKRHRED = unitsSet.size > 0;
    const databaseType = hasKRHRED ? 'Dynamic Database' : 'Static Database';
    
    // Build summary section
    html += `
      <div class="results-summary">
        <h4>Database Summary</h4>
        <p>Database Type: <span class="info-count">${databaseType}</span></p>
        <p>Total Database Entries: <span class="info-count">${totalDB.toLocaleString()}</span></p>
      </div>
    `;
    
    // Build KRHRED list only if there are valid units
    if (unitsSet.size > 0) {
      html += '<div class="krhred-list"><h5>All KRHRED Units</h5><div class="units-container">';
      
      // Use join for better performance
      const unitBadges = Array.from(unitsSet).map(unit => {
        const hasError = errorUnits.has(unit);
        return `<span class="unit-badge ${hasError ? 'error' : 'success'}">${unit}</span>`;
      }).join('');
      
      html += unitBadges + '</div></div>';
    }
    
    html += '</div>';
    return html;
  }
  
  async renderErrorsInBatches(container, errorUnits, unitDetails) {
    const startTime = performance.now();
    // Group errors by type
    const errorGroups = {
      'Missing Required Fields': [],
      'Invalid Data': [],
      'Invalid KRHRED Format': [],
      'Invalid Email': [],
      'Data Too Long (>60 chars)': []
    };
    
    // Collect errors - optimized version
    for (const unit of errorUnits) {
      const details = unitDetails.get(unit);
      if (!details) continue;
      
      for (const item of details) {
        const errorType = this.getErrorType(item.error);
        if (errorGroups[errorType]) {
          errorGroups[errorType].push({
            unit: unit,
            lineNumber: item.lineNumber,
            lineText: item.lineText,
            error: item.error
          });
        }
      }
    }
    
    // Render each error category
    const BATCH_SIZE = 50; // Render 50 errors at a time
    
    for (const [errorType, errors] of Object.entries(errorGroups)) {
      if (errors.length === 0) continue;
      
      // Create category container
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'error-category';
      
      // Category header with error count
      const header = document.createElement('h5');
      header.innerHTML = `<i class="fa-solid fa-exclamation-triangle"></i> ${errorType} <span class="error-count">${errors.length}</span>`;
      categoryDiv.appendChild(header);
      
      // Group all errors by krhred unit (same treatment as Invalid Data)
      const errorsByUnit = new Map();
      errors.forEach(error => {
        if (!errorsByUnit.has(error.unit)) {
          errorsByUnit.set(error.unit, []);
        }
        errorsByUnit.get(error.unit).push(error);
      });
      
      // Check if we need virtual scrolling
      const totalErrors = errors.length;
      const useVirtualScroll = totalErrors > 1000;
      
      if (useVirtualScroll) {
        // Create virtual scroller container
        const virtualContainer = document.createElement('div');
        virtualContainer.className = 'error-virtual-container';
        virtualContainer.style.height = '500px';
        virtualContainer.style.overflow = 'auto';
        
        // Flatten all errors with unit info
        const allErrors = [];
        for (const [unit, unitErrors] of errorsByUnit) {
          for (const error of unitErrors) {
            allErrors.push({ ...error, unit });
          }
        }
        
        // Create content container
        const baseItemHeight = 50; // Base height, will be adjusted dynamically
        const contentContainer = document.createElement('div');
        contentContainer.className = 'error-content-container';
        contentContainer.style.position = 'relative';
        
        // Calculate heights dynamically
        const calculateItemHeight = (error) => {
          const textLength = error.lineText ? error.lineText.length : 0;
          // Approximate height based on text length (assuming ~80 chars per line)
          const estimatedLines = Math.ceil(textLength / 80);
          return Math.max(50, 30 + (estimatedLines * 18)); // Min 50px, 18px per line
        };
        
        // Calculate total height
        let totalHeight = 0;
        const itemPositions = [];
        for (let i = 0; i < allErrors.length; i++) {
          itemPositions.push(totalHeight);
          totalHeight += calculateItemHeight(allErrors[i]);
        }
        contentContainer.style.height = `${totalHeight}px`;
        
        virtualContainer.appendChild(contentContainer);
        categoryDiv.appendChild(virtualContainer);
        
        // Track last rendered unit to avoid duplicates
        let lastRenderedUnit = null;
        
        // Render function
        const renderVisibleItems = () => {
          const scrollTop = virtualContainer.scrollTop;
          
          // Find visible items based on positions
          let startIndex = 0;
          let endIndex = 0;
          
          for (let i = 0; i < itemPositions.length; i++) {
            if (itemPositions[i] < scrollTop + virtualContainer.clientHeight) {
              endIndex = i + 1;
            }
            if (itemPositions[i] + calculateItemHeight(allErrors[i]) < scrollTop) {
              startIndex = i + 1;
            }
          }
          
          endIndex = Math.min(allErrors.length, startIndex + 20); // Limit to 20 items at once
          
          // Clear only items that are no longer visible
          const existingItems = contentContainer.querySelectorAll('.error-item, .error-unit-header');
          existingItems.forEach(item => {
            const index = parseInt(item.dataset.index);
            if (index < startIndex || index >= endIndex) {
              item.remove();
            }
          });
          
          // Render visible items
          for (let i = startIndex; i < endIndex; i++) {
            const error = allErrors[i];
            
            // Check if already rendered
            if (contentContainer.querySelector(`[data-index="${i}"]`)) {
              continue;
            }
            
            // Check if we need a unit header
            if (error.unit !== lastRenderedUnit) {
              const header = document.createElement('div');
              header.className = 'error-unit-header';
              header.innerHTML = `<strong>${error.unit}</strong>`;
              header.style.position = 'absolute';
              header.style.top = `${itemPositions[i]}px`;
              header.style.left = '0';
              header.style.right = '0';
              header.style.height = '30px';
              header.style.zIndex = '2';
              header.dataset.index = i;
              contentContainer.appendChild(header);
              lastRenderedUnit = error.unit;
            }
            
            // Create error item
            const errorDiv = document.createElement('div');
            errorDiv.className = `error-item ${this.getErrorSeverity(error.error)}`;
            errorDiv.style.position = 'absolute';
            errorDiv.style.top = `${itemPositions[i] + (lastRenderedUnit === error.unit ? 0 : 30)}px`;
            errorDiv.style.left = '16px';
            errorDiv.style.right = '16px';
            const itemHeight = calculateItemHeight(error);
            errorDiv.style.height = `${itemHeight}px`;
            errorDiv.dataset.index = i;
            
            errorDiv.innerHTML = `
              <div class="error-details">
                <div class="error-line" data-line-prefix="Line ${error.lineNumber}:">${escapeHtml(error.lineText)}</div>
              </div>
            `;
            
            contentContainer.appendChild(errorDiv);
          }
        };
        
        // Initial render
        renderVisibleItems();
        
        // Throttled scroll handler
        let scrollTimeout;
        virtualContainer.addEventListener('scroll', () => {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(renderVisibleItems, 10);
        });
        
      } else {
        // Normal rendering for smaller error sets
        const fragment = document.createDocumentFragment();
        let unitCount = 0;
        
        for (const [unit, unitErrors] of errorsByUnit) {
          unitCount++;
          
          const unitDiv = document.createElement('div');
          unitDiv.className = 'error-unit-group';
          
          // Unit header with error count
          const unitHeader = document.createElement('div');
          unitHeader.className = 'error-unit-header';
          unitHeader.innerHTML = `<strong>${unit}</strong> <span class="error-count-unit">${unitErrors.length} errors</span>`;
          unitDiv.appendChild(unitHeader);
          
          // Show ALL errors for this unit
          unitErrors.forEach(error => {
            const errorDiv = document.createElement('div');
            errorDiv.className = `error-item ${this.getErrorSeverity(error.error)}`;
            
            errorDiv.innerHTML = `
              <div class="error-details">
                <div class="error-line" data-line-prefix="Line ${error.lineNumber}:">${escapeHtml(error.lineText)}</div>
              </div>
            `;
            
            unitDiv.appendChild(errorDiv);
          });
          
          fragment.appendChild(unitDiv);
          
          // Yield after every 5 units to prevent UI freezing
          if (unitCount % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        
        categoryDiv.appendChild(fragment);
      }
      
      // Append the category to container
      container.appendChild(categoryDiv);
    }
    
    console.log(`\u2705 renderErrorsInBatches completed in ${(performance.now() - startTime).toFixed(2)}ms`);
  }
  
  getErrorSeverity(errorMsg) {
    if (errorMsg.includes('Invalid format')) {
      return 'severe';
    } else if (errorMsg.includes('Missing fields')) {
      return 'severe';
    } else if (errorMsg.includes('Invalid email')) {
      return 'warning';
    }
    return 'error';
  }

  // Helper to determine error type
  getErrorType(errorMsg) {
    if (errorMsg.includes('Missing fields')) {
      return 'Missing Required Fields';
    } else if (errorMsg.includes('Invalid data')) {
      return 'Invalid Data';
    } else if (errorMsg.includes('KRHRED too long')) {
      return 'KRHRED Too Long (>60 chars)';
    } else if (errorMsg.includes('Invalid format')) {
      return 'Invalid KRHRED Format';
    } else if (errorMsg.includes('Invalid email')) {
      return 'Invalid Email';
    } else if (errorMsg.includes('Data too long')) {
      return 'Data Too Long (>60 chars)';
    }
    return 'Other';
  }

  countUniqueCMPGIDs(lines){
    const s = new Set();
    
    // Optimized for large datasets with chunked processing
    const CHUNK_SIZE = 10000;
    
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      const chunk = lines.slice(i, i + CHUNK_SIZE);
      
      // Process chunk
      for (const line of chunk) {
        if (!line || line.length === 0) continue;
        
        // Find first pipe character instead of split for better performance
        const pipeIndex = line.indexOf('|');
        if (pipeIndex === -1) continue;
        
        const cmpg = line.substring(0, pipeIndex).trim();
        if (cmpg) s.add(cmpg);
      }
      
      // Yield to browser every chunk to prevent blocking
      if (i + CHUNK_SIZE < lines.length) {
        if (typeof setImmediate !== 'undefined') {
          setImmediate(() => {});
        } else {
          setTimeout(() => {}, 0);
        }
      }
    }
    
    return s.size;
  }

  // Async version with chunked processing
  async countUniqueCMPGIDsAsync(lines) {
    const s = new Set();
    const CHUNK_SIZE = 50000; // Process 50k lines at a time
    
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      const chunk = lines.slice(i, i + CHUNK_SIZE);
      
      // Process chunk
      for (const line of chunk) {
        if (!line || line.length === 0) continue;
        
        const pipeIndex = line.indexOf('|');
        if (pipeIndex === -1) continue;
        
        const cmpg = line.substring(0, pipeIndex).trim();
        if (cmpg) s.add(cmpg);
      }
      
      // Yield to browser after each chunk
      if (i + CHUNK_SIZE < lines.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    return s.size;
  }
}

/* ========= Utils ========= */
function escapeHtml(str){
  return (str ?? '').replace(/[&<>"']/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[s]));
}

/* ========= Quick Stats Update ========= */
function updateQuickStats() {
  // Use async version for better performance
  updateQuickStatsAsync().catch(console.error);
}

async function updateQuickStatsAsync() {
  const totalRowsEl = document.getElementById('totalRows');
  const errorCountEl = document.getElementById('errorCount');
  
  // Update based on current data - count unique CMPG_ID
  if (window.dbChecker && window.dbChecker.currentLines) {
    // Show loading state for large datasets
    if (window.dbChecker.currentLines.length > 100000) {
      if (totalRowsEl) totalRowsEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }
    
    // Use Web Worker if available for large datasets
    if (window.dbChecker.worker && window.dbChecker.currentLines.length > 50000) {
      // Worker will handle the counting
      window.dbChecker.worker.postMessage({
        type: 'countUniqueCMPGIDs',
        data: { lines: window.dbChecker.currentLines }
      });
    } else {
      // Use async counting for better performance
      const uniqueCMPG = await window.dbChecker.countUniqueCMPGIDsAsync(window.dbChecker.currentLines);
      if (totalRowsEl) {
        totalRowsEl.textContent = uniqueCMPG.toLocaleString();
      }
    }
    
    // Count errors from results
    const resultsContainer = document.getElementById('resultsContainer');
    if (resultsContainer && errorCountEl) {
      const errorItems = resultsContainer.querySelectorAll('.error-item');
      errorCountEl.textContent = errorItems.length.toLocaleString();
    }
  } else {
    if (totalRowsEl) totalRowsEl.textContent = '0';
    if (errorCountEl) errorCountEl.textContent = '0';
  }
}

/* ========= Boot ========= */
const app = new DatabaseChecker();
window.dbChecker = app; // Make app globally accessible
