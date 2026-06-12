
// ---- Extracted scripts from inline <script> blocks ----
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const calendarDays = document.getElementById('calendar-days');
    const monthYear = document.getElementById('month-year');
    const prevMonthButton = document.getElementById('prev-month');
    const nextMonthButton = document.getElementById('next-month');
    const todayButton = document.getElementById('today-btn');
    const holidayDescription = document.getElementById('holiday-description');
    const starsContainer = document.getElementById('stars');

    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();

    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    // Define holidays with date keys and descriptions
    window.holidays = {
      // Format: 'YYYY-MM-DD': 'Holiday Description'
      
      // 2024 National Holidays
      '2024-01-01': 'Tahun Baru Masehi',
      '2024-02-10': 'Tahun Baru Imlek',
      '2024-03-11': 'Hari Suci Nyepi',
      '2024-04-10': 'Wafat Isa Almasih',
      '2024-05-01': 'Hari Buruh Internasional',
      '2024-05-09': 'Kenaikan Yesus Kristus',
      '2024-05-23': 'Hari Raya Waisak',
      '2024-06-01': 'Hari Lahir Pancasila',
      '2024-06-10': 'Hari Raya Idul Fitri',
      '2024-06-11': 'Hari Raya Idul Fitri',
      '2024-07-17': 'Hari Raya Idul Adha',
      '2024-08-17': 'Hari Kemerdekaan RI',
      '2024-12-25': 'Hari Raya Natal',
      
      // 2025 National Holidays
      '2025-01-01': 'Tahun Baru Masehi',
      '2025-01-28': 'Tahun Baru Imlek',
      '2025-03-29': 'Hari Suci Nyepi',
      '2025-04-18': 'Wafat Isa Almasih',
      '2025-05-01': 'Hari Buruh Internasional',
      '2025-05-12': 'Kenaikan Yesus Kristus',
      '2025-05-29': 'Hari Raya Waisak',
      '2025-06-01': 'Hari Lahir Pancasila',
      '2025-03-31': 'Hari Raya Idul Fitri',
      '2025-04-01': 'Hari Raya Idul Fitri',
      '2025-06-06': 'Hari Raya Idul Adha',
      '2025-08-17': 'Hari Kemerdekaan RI',
      '2025-12-25': 'Hari Raya Natal',
      
      // 2026 National Holidays (Projected/Estimate)
      '2026-01-01': 'Tahun Baru Masehi',
      '2026-01-29': 'Tahun Baru Imlek 2577',
      '2026-03-09': 'Hari Suci Nyepi',
      '2026-04-03': 'Wafat Isa Almasih',
      '2026-05-01': 'Hari Buruh Internasional',
      '2026-05-21': 'Kenaikan Yesus Kristus',
      '2026-06-01': 'Hari Lahir Pancasila',
      '2026-03-20': 'Hari Raya Idul Fitri 1447 H',
      '2026-03-21': 'Hari Raya Idul Fitri 1447 H',
      '2026-05-26': 'Hari Raya Idul Adha 1447 H',
      '2026-08-17': 'Hari Kemerdekaan RI ke-71',
      '2026-12-25': 'Hari Raya Natal',
      '2026-12-31': 'Tahun Baru Masehi (Libur Bersama)',
      
      // Joint Holidays 2024
      '2024-02-09': 'Cuti Bersama Tahun Baru Imlek',
      '2024-03-12': 'Cuti Bersama Hari Suci Nyepi',
      '2024-04-08': 'Cuti Bersama Wafat Isa Almasih',
      '2024-04-09': 'Cuti Bersama Wafat Isa Almasih',
      '2024-04-11': 'Cuti Bersama Kenaikan Yesus',
      '2024-05-08': 'Cuti Bersama Idul Fitri',
      '2024-05-24': 'Cuti Bersama Waisak',
      '2025-06-02': 'Cuti Bersama Idul Fitri',
      '2025-06-05': 'Cuti Bersama Idul Fitri',
      '2025-06-07': 'Cuti Bersama Idul Adha',
      '2025-06-30': 'Cuti Bersama Hari Raya Idul Adha',
      '2025-12-26': 'Cuti Bersama Hari Raya Natal',
      
      // Joint Holidays 2026 (Projected)
      '2026-01-30': 'Cuti Bersama Tahun Baru Imlek',
      '2026-03-10': 'Cuti Bersama Hari Suci Nyepi',
      '2026-03-19': 'Cuti Bersama Idul Fitri',
      '2026-03-22': 'Cuti Bersama Idul Fitri',
      '2026-05-25': 'Cuti Bersama Idul Adha',
      '2026-05-27': 'Cuti Bersama Idul Adha',
      '2026-08-18': 'Cuti Bersama Hari Kemerdekaan',
    };

    function createStars() {
      // Reduced star count for better performance
      for (let i = 0; i < 20; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.animationDuration = `${Math.random() * 5 + 5}s`;
        starsContainer.appendChild(star);
      }
    }

    createStars();

    // IndexedDB utility functions
    function openDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('CalendarDB', 1);
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('days')) {
            db.createObjectStore('days', { keyPath: 'date' });
          }
        };
        request.onsuccess = (event) => {
          resolve(event.target.result);
        };
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    }

    function getDayState(db, date) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['days'], 'readonly');
        const store = transaction.objectStore('days');
        const request = store.get(date);
        request.onsuccess = () => {
          resolve(request.result ? request.result.state : null);
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    }

    function putDayState(db, date, state) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['days'], 'readwrite');
        const store = transaction.objectStore('days');
        if (state === null) {
          const deleteRequest = store.delete(date);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(deleteRequest.error);
        } else {
          const request = store.put({ date, state });
          request.onsuccess = () => {
            resolve();
          };
          request.onerror = () => {
            reject(request.error);
          };
        }
      });
    }

    // Helper to format date as YYYY-MM-DD
    function formatDateForCalendar(year, month, day) {
      const mm = (month + 1).toString().padStart(2, '0');
      const dd = day.toString().padStart(2, '0');
      return `${year}-${mm}-${dd}`;
    }

    async function renderCalendar(month, year) {
      const db = await openDB();

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDay = firstDay.getDay();

      monthYear.textContent = `${months[month]} ${year}`;
      calendarDays.innerHTML = '';

      // Add weekday headers
      const weekdayHeaders = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
      weekdayHeaders.forEach(day => {
        const headerElement = document.createElement('div');
        headerElement.classList.add('weekday-header');
        headerElement.textContent = day;
        calendarDays.appendChild(headerElement);
      });

      // Add days from previous month
      const prevMonthLastDay = new Date(year, month, 0).getDate();
      for (let i = startingDay - 1; i >= 0; i--) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('day', 'other-month');
        const dayNumber = document.createElement('div');
        dayNumber.classList.add('day-number');
        dayNumber.textContent = prevMonthLastDay - i;
        const dayName = document.createElement('div');
        dayName.classList.add('day-name');
        // Calculate day name for previous month day
        const prevMonthDate = new Date(year, month - 1, prevMonthLastDay - i);
        dayName.textContent = days[prevMonthDate.getDay()];
        dayElement.appendChild(dayNumber);
        dayElement.appendChild(dayName);
        calendarDays.appendChild(dayElement);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('day');

        const dayNumber = document.createElement('div');
        dayNumber.classList.add('day-number');
        dayNumber.textContent = day;

        const dayName = document.createElement('div');
        dayName.classList.add('day-name');
        const currentDate = new Date(year, month, day);
        dayName.textContent = days[currentDate.getDay()];

        dayElement.appendChild(dayNumber);
        dayElement.appendChild(dayName);

        const dateKey = formatDateForCalendar(year, month, day);

        // Load saved state from IndexedDB and apply class
        const savedState = await getDayState(db, dateKey);
        let clickCount = 0;
        if (savedState === 'wfh') {
          dayElement.classList.add('wfh');
          clickCount = 1;
        } else if (savedState === 'other') {
          dayElement.classList.add('other');
          clickCount = 2;
        }

        if (currentDate.toDateString() === new Date().toDateString()) {
          dayElement.classList.add('today');
        }

        // Check if the day is a holiday
        if (holidays[dateKey]) {
          dayElement.classList.add('holiday');
          // Check if it's a joint holiday
          if (holidays[dateKey].includes('Cuti Bersama')) {
            dayElement.classList.add('joint-holiday');
          }
          dayElement.addEventListener('click', () => {
            holidayDescription.textContent = holidays[dateKey];
          });
        } else if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
          dayElement.classList.add('weekend');
        } else {
          dayElement.addEventListener('click', async () => {
            clickCount++;
            if (clickCount === 1) {
              dayElement.classList.remove('other');
              dayElement.classList.add('wfh');
              await putDayState(db, dateKey, 'wfh');
              holidayDescription.textContent = '';
            } else if (clickCount === 2) {
              dayElement.classList.remove('wfh');
              dayElement.classList.add('other');
              await putDayState(db, dateKey, 'other');
              holidayDescription.textContent = '';
            } else {
              dayElement.classList.remove('wfh', 'other');
              clickCount = 0;
              await putDayState(db, dateKey, null);
              holidayDescription.textContent = '';
            }
            // Update total count display live on click
            updateTotalCount();
            updateStatistics();
          });
        }

        calendarDays.appendChild(dayElement);
      }

      const totalCells = startingDay + daysInMonth;
      const remainder = totalCells % 7;
      const emptyCellsNeeded = remainder === 0 ? 0 : 7 - remainder;

      // Add days from next month only if last week is incomplete
      for (let i = 1; i <= emptyCellsNeeded; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('day', 'other-month');
        const dayNumber = document.createElement('div');
        dayNumber.classList.add('day-number');
        dayNumber.textContent = i;
        const dayName = document.createElement('div');
        dayName.classList.add('day-name');
        const nextMonthDate = new Date(year, month + 1, i);
        dayName.textContent = days[nextMonthDate.getDay()];
        dayElement.appendChild(dayNumber);
        dayElement.appendChild(dayName);
        calendarDays.appendChild(dayElement);
      }

      // Add total count display below calendar
      let totalCountElement = document.getElementById('total-count');
      if (!totalCountElement) {
        totalCountElement = document.createElement('div');
        totalCountElement.id = 'total-count';
        totalCountElement.className = 'total-count';
        calendarDays.parentNode.appendChild(totalCountElement);
      }
      
      // Calculate counts
      const wfhDays = document.querySelectorAll('.day.wfh').length;
      const wfoDays = document.querySelectorAll('.day.other').length;
      
      // Update total count HTML
      totalCountElement.innerHTML = `
        <div class="count-item wfh">
          <div class="count-label">WFH Days</div>
          <div class="count-number">${wfhDays}</div>
        </div>
        <div class="count-item wfo">
          <div class="count-label">WFO Days</div>
          <div class="count-number">${wfoDays}</div>
        </div>
      `;
      
      // Update statistics
      updateStatistics();
    }

    // Update total count display
    function updateTotalCount() {
      const totalCountElement = document.getElementById('total-count');
      if (!totalCountElement) return;
      
      const wfhDays = document.querySelectorAll('.day.wfh').length;
      const wfoDays = document.querySelectorAll('.day.other').length;
      
      totalCountElement.innerHTML = `
        <div class="count-item wfh">
          <div class="count-label">WFH Days</div>
          <div class="count-number">${wfhDays}</div>
        </div>
        <div class="count-item wfo">
          <div class="count-label">WFO Days</div>
          <div class="count-number">${wfoDays}</div>
        </div>
      `;
    }

    // Update summary statistics
    function updateStatistics() {
      const totalDaysElement = document.getElementById('total-days');
      const workDaysElement = document.getElementById('work-days');
      const holidaysCountElement = document.getElementById('holidays-count');
      const wfhPercentageElement = document.getElementById('wfh-percentage');
      
      if (!totalDaysElement) return;
      
      // Calculate total days in month
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      totalDaysElement.textContent = daysInMonth;
      
      // Calculate work days (excluding weekends)
      let workDays = 0;
      let holidays = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workDays++;
        }
        
        // Count holidays
        const dateKey = formatDateForCalendar(currentYear, currentMonth, day);
        if (window.holidays && window.holidays[dateKey]) {
          holidays++;
        }
      }
      
      workDaysElement.textContent = workDays;
      holidaysCountElement.textContent = holidays;
      
      // Calculate WFH percentage
      const wfhDays = document.querySelectorAll('.day.wfh').length;
      const percentage = workDays > 0 ? Math.round((wfhDays / workDays) * 100) : 0;
      wfhPercentageElement.textContent = `${percentage}%`;
    }

    prevMonthButton.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendar(currentMonth, currentYear);
      holidayDescription.textContent = '';
    });

    nextMonthButton.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendar(currentMonth, currentYear);
      holidayDescription.textContent = '';
    });

    // Today button event listener
    todayButton.addEventListener('click', () => {
      const today = new Date();
      currentMonth = today.getMonth();
      currentYear = today.getFullYear();
      renderCalendar(currentMonth, currentYear);
      holidayDescription.textContent = '';
    });

    renderCalendar(currentMonth, currentYear);
});
