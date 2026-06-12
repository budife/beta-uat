// ===================================
// BOOKMARKLET PAGE - Performance Optimized
// ===================================

// Simple initialization without animations
document.addEventListener('DOMContentLoaded', () => {
    console.log('Bookmarklet page loaded - Performance mode');
    
    // Initialize search functionality
    const searchInput = document.getElementById('bookmarkletSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.bookmarklet-card');
            
            cards.forEach(card => {
                const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
                const description = card.querySelector('p')?.textContent.toLowerCase() || '';
                
                if (title.includes(searchTerm) || description.includes(searchTerm)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
    
    // Clear search button
    const clearBtn = document.querySelector('.bookmarklet-filter-btn');
    if (clearBtn && clearBtn.textContent.includes('Clear')) {
        clearBtn.addEventListener('click', () => {
            const searchInput = document.getElementById('bookmarkletSearch');
            if (searchInput) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            }
        });
    }
    
    // Grid/List view toggle
    const gridBtn = document.querySelector('.bookmarklet-filter-btn:last-child');
    let isGridView = true;
    
    if (gridBtn) {
        gridBtn.addEventListener('click', () => {
            const grid = document.getElementById('bookmarkletsGrid');
            if (grid) {
                isGridView = !isGridView;
                grid.classList.toggle('list-view', !isGridView);
                gridBtn.innerHTML = isGridView ? 
                    '<i class="fa-solid fa-grip"></i> Grid' : 
                    '<i class="fa-solid fa-list"></i> List';
            }
        });
    }
    
    // Setup drag and drop for bookmarklets
    const bookmarkletBtns = document.querySelectorAll('.bookmarklet-btn');
    bookmarkletBtns.forEach(btn => {
        // Prevent default drag behavior
        btn.addEventListener('dragstart', (e) => {
            // Use the href as the drag data
            e.dataTransfer.setData('text/uri-list', btn.href);
            e.dataTransfer.setData('text/plain', btn.href);
        });
        
        // Click handler for mobile
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // For mobile, show instructions
            if (window.innerWidth <= 768) {
                alert('Drag this button to your bookmarks bar to install the bookmarklet');
            }
        });
    });
});