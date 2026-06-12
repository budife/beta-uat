/**
 * Footer Global JavaScript
 * Handles common footer functionality across all pages
 */

// Update footer year
document.addEventListener('DOMContentLoaded', () => {
  const footerYear = document.getElementById('footer-year');
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }
  
  // Add smooth scroll behavior for footer links
  const footerLinks = document.querySelectorAll('.footer-link');
  footerLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      // Add ripple effect if needed
      if (link.classList.contains('add-ripple')) {
        e.preventDefault();
        createRipple(e, link);
      }
    });
  });
});

// Optional: Create ripple effect for footer links
function createRipple(e, button) {
  const ripple = document.createElement('span');
  ripple.classList.add('ripple');
  button.appendChild(ripple);
  
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  
  setTimeout(() => ripple.remove(), 600);
}
