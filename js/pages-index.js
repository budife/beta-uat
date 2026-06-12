// ===================================
// INDEX PAGE JAVASCRIPT - Performance Optimized (No Animations)
// ===================================

// Page load initialization - No animations for better performance
document.addEventListener('DOMContentLoaded', () => {
  // Tool items visible immediately - no fade-in animation
  console.log('eDM Helper loaded - Performance mode enabled');
  
  // Direct navigation without ripple effects
  document.querySelectorAll('.tool-link').forEach(link => {
    // No click effects for better performance
  });

  // Stats displayed immediately - no counting animation
  const stats = document.querySelectorAll('.stat-number');
  stats.forEach(stat => {
    // Numbers shown directly without animation
  });

  // Remove any existing animations if present
  document.querySelectorAll('.tool-item').forEach(item => {
    item.style.opacity = '1';
    item.style.transform = 'none';
    item.style.transition = 'none';
  });
});
