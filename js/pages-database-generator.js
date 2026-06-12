
// ---- Extracted scripts from inline <script> blocks ----
const $ = (sel) => document.querySelector(sel);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const campaignRegex = /^\d{8}[A-Za-z]?_.*$/; // Format: YYYYMMDD atau YYYYMMDDX, diikuti _Nama-Campaign_XXXX

    const campaignIdEl = $('#campaignId');

    // Email/KR elements
    const newEmailEl = $('#newEmail');
    const addEmailBtn = $('#addEmail');

    // BULK refs
    const bulkBtn = $('#bulkBtn');
    const bulkBox = $('#bulkBox');
    const bulkEmailsEl = $('#bulkEmails');
    const applyBulkBtn = $('#applyBulk');
    const cancelBulkBtn = $('#cancelBulk');
    const bulkInfo = $('#bulkInfo');

    const newKeyEl = $('#newKey');
    const addKeyBtn = $('#addKey');
    const krHeadRow = $('#krHeadRow');
    const krBody = $('#krBody');

    const btnDownload = $('#btnDownload');
    const btnSave = $('#btnSave');
    const stateMsg = $('#stateMsg');
    const errorEl = $('#error');
    const previewsEl = $('#previews');
    const countInfo = $('#countInfo');
    const invalidInfo = $('#invalidInfo');

    const dlSection = $('#dlSection');
    const downloadsList = $('#downloadsList');

    // State
    let emails = [];                 // ["a@a.com", ...]
    let krKeys = [];                 // ["KRHRED_Unit_30", ...]
    const krValues = new Map();      // email -> Map(key -> value)
    let campaignType = 'static';     // 'static' or 'dynamic'

    // Get KRHRED section element
    const krhredSection = $('#krhredSection');

    // ---------- Helpers ----------
    function parseManyEmails(text) {
      const raw = (text || '')
        .split(/[\n,;\s]+/)        // baris, koma, titik koma, spasi
        .map(s => s.trim())
        .filter(Boolean);
      const out = [];
      const seen = new Set(emails);  // hindari duplikat dgn existing
      for (const e of raw) {
        if (!seen.has(e)) { out.push(e); seen.add(e); }
      }
      return out;
    }

    function normalizeKey(k) {
      if (k && k.trim()) {
        let key = k.trim();
        if (!/^KRHRED_/i.test(key)) key = 'KRHRED_' + key;
        key = key.replace(/\s+/g, '_');
        return key;
      }
      // auto-generate KRHRED_Unit_N starting at 30
      const nums = krKeys
        .map(x => (/KRHRED_Unit_(\d+)/i.exec(x)?.[1]))
        .filter(Boolean)
        .map(n => parseInt(n, 10));
      const max = nums.length ? Math.max(...nums) : 29;
      return `KRHRED_Unit_${max + 1}`;
    }

    function ensureRowMap(email) {
      if (!krValues.has(email)) krValues.set(email, new Map());
      return krValues.get(email);
    }

    function migrateEmail(oldEmail, newEmail) {
      if (oldEmail === newEmail) return;
      if (!emailRegex.test(newEmail)) return; // ignore invalid sampai valid
      if (emails.includes(newEmail)) return; // hindari duplikat
      const map = krValues.get(oldEmail) || new Map();
      krValues.delete(oldEmail);
      krValues.set(newEmail, map);
      emails = emails.map(e => (e === oldEmail ? newEmail : e));
      renderTable();
      updateUI();
    }

    function removeEmailRow(email) {
      emails = emails.filter(e => e !== email);
      krValues.delete(email);
      renderTable();
      updateUI();
    }

    function renderTable() {
      // Header: hapus kolom KR lama
      krHeadRow.querySelectorAll('th[data-key]').forEach(th => th.remove());
      for (const key of krKeys) {
        const th = document.createElement('th');
        th.className = 'krhred-header';
        th.setAttribute('data-key', key);
        th.innerHTML = `
          <div class="krhred-header-content">
            <span class="krhred-key">${key}</span>
            <button class="krhred-remove-btn" title="Hapus kolom" data-remove-key="${key}">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>`;
        krHeadRow.appendChild(th);
      }

      // Body
      krBody.innerHTML = '';
      if (emails.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
          <td colspan="100%" class="table-empty-state">
            <i class="fa-solid fa-inbox"></i>
            <p>Belum ada email ditambahkan</p>
          </td>
        `;
        krBody.appendChild(emptyRow);
        return;
      }

      for (const email of emails) {
        const tr = document.createElement('tr');

        const tdEmail = document.createElement('td');
        tdEmail.className = 'email-column';
        tdEmail.innerHTML = `
          <div class="email-input-wrapper">
            <input class="email-input" value="${email}" placeholder="email@example.com" />
            <button class="email-remove-btn" title="Hapus email" data-remove-email="${email}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>`;
        tr.appendChild(tdEmail);

        const rowMap = ensureRowMap(email);
        for (const key of krKeys) {
          const td = document.createElement('td');
          td.className = 'krhred-column';
          const inp = document.createElement('input');
          inp.className = 'krhred-input';
          inp.value = rowMap.get(key) ?? '';
          inp.placeholder = 'nilai';
          inp.addEventListener('input', () => { rowMap.set(key, inp.value); updateUI(); });
          td.appendChild(inp);
          tr.appendChild(td);
        }
        krBody.appendChild(tr);

        // email change listener
        const emailInput = tdEmail.querySelector('input');
        emailInput.addEventListener('change', () => migrateEmail(email, emailInput.value.trim()));
      }

      // Listeners: remove email / remove key
      krHeadRow.querySelectorAll('button[data-remove-key]').forEach(btn => {
        btn.addEventListener('click', () => {
          const k = btn.getAttribute('data-remove-key');
          krKeys = krKeys.filter(x => x !== k);
          for (const m of krValues.values()) m.delete(k);
          renderTable();
          updateUI();
        });
      });
      krBody.querySelectorAll('button[data-remove-email]').forEach(btn => {
        btn.addEventListener('click', () => removeEmailRow(btn.getAttribute('data-remove-email')));
      });
    }

    function recordId(campaignId, i) { return `${campaignId}-${String(i + 1).padStart(6, '0')}`; }
    function rowCustMast(id, email) { const emptyCount = 17; const empties = Array(emptyCount).fill('').join('|'); return `${id}|${email}|${empties}|\n`; }
    function rowCustPref(id, email, campaignId) { return `${id}|${email}|CMPG_ID|${campaignId}|\n`; }
    function rowCustSubs(id, email) { return `${id}|${email}|IMO Marketing|Y|\n`; }
    function rowsCustAttrStatic(id, email, campaignId) { return `${id}|${email}|CMPG_ID|${campaignId}|\n`; }
    function rowsCustAttrDynamic(id, email, campaignId) {
      let out = `${id}|${email}|CMPG_ID|${campaignId}|\n`;
      const rowMap = krValues.get(email) || new Map();
      for (const key of krKeys) { const val = rowMap.get(key) ?? ''; out += `${id}|${email}|${key}|${val}|\n`; }
      return out;
    }

    function buildAllFiles(campaignId, emailList, useKr) {
      let mast = '', pref = '', subs = '', attr = '';
      
      // Build records by email (correct order)
      emailList.forEach((email, i) => {
        const id = recordId(campaignId, i);
        mast += rowCustMast(id, email);
        pref += rowCustPref(id, email, campaignId);
        subs += rowCustSubs(id, email);
      });
      
      // For CustAttr, if dynamic, build by key groups
      if (useKr) {
        // Add CMPG_ID for all emails
        emailList.forEach((email, i) => {
          const id = recordId(campaignId, i);
          attr += `${id}|${email}|CMPG_ID|${campaignId}|\n`;
        });
        
        // Add KRHRED values grouped by key
        krKeys.forEach(key => {
          emailList.forEach((email, i) => {
            const id = recordId(campaignId, i);
            const rowMap = krValues.get(email) || new Map();
            const val = rowMap.get(key) ?? '';
            attr += `${id}|${email}|${key}|${val}|\n`;
          });
        });
      } else {
        // Static: just add CMPG_ID
        emailList.forEach((email, i) => {
          const id = recordId(campaignId, i);
          attr += rowsCustAttrStatic(id, email, campaignId);
        });
      }
      
      return {
        [`${campaignId}-CustMast.txt`]: mast,
        [`${campaignId}-CustPref.txt`]: pref,
        [`${campaignId}-CustSubs.txt`]: subs,
        [`${campaignId}-CustAttr.txt`]: attr,
      };
    }

    function downloadText(name, content) {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a);
      setTimeout(() => {
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
      }, 0);
    }

    function renderDownloadLinks(files) {
      downloadsList.innerHTML = '';
      for (const [name, content] of Object.entries(files)) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name;
        a.textContent = `⬇️ ${name}`;
        a.className = 'inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 w-fit';
        downloadsList.appendChild(a);
        // revoke setelah 2 menit (link cukup lama untuk di-klik)
        setTimeout(() => { URL.revokeObjectURL(url); a.removeAttribute('href'); a.classList.add('opacity-50','pointer-events-none'); }, 120000);
      }
      dlSection.classList.remove('hidden');
    }

    async function saveAllToFolder(files) {
      errorEl.classList.add('hidden');
      try {
        if (!('showDirectoryPicker' in window)) throw new Error("Browser Anda tidak mendukung 'Save to folder'. Coba Chrome/Edge desktop.");
        const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        for (const [name, content] of Object.entries(files)) {
          const fileHandle = await dirHandle.getFileHandle(name, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(content);
          await writable.close();
        }
      } catch (e) {
        if (e && e.name === 'AbortError') return;
        errorEl.textContent = e?.message || 'Gagal menyimpan ke folder.';
        errorEl.classList.remove('hidden');
      }
    }

    function updateUI() {
      const campaignIdVal = campaignIdEl.value.trim();
      const useKrVal = campaignType === 'dynamic' && krKeys.length > 0;

      // Stats & validation
      const invalid = emails.filter(e => !emailRegex.test(e));
      countInfo.textContent = `Total: ${emails.length}`;
      if (invalid.length) {
        invalidInfo.textContent = `Invalid: ${invalid.slice(0,3).join(', ')}${invalid.length>3?', …':''}`;
        invalidInfo.classList.remove('hidden');
      } else {
        invalidInfo.classList.add('hidden');
      }

      const ok = campaignRegex.test(campaignIdVal) && emails.length > 0 && invalid.length === 0;
      btnDownload.disabled = !ok;
      btnSave.disabled = !ok;

      stateMsg.textContent = ok
        ? ''
        : (!campaignRegex.test(campaignIdVal)
            ? 'Isi Campaign ID diawali YYYYMMDD.'
            : 'Tambahkan minimal 1 email valid.');

      // Previews
      previewsEl.innerHTML = '';
      if (!ok) return;
      
      // Build actual preview content
      const files = buildAllFiles(campaignIdVal, emails, useKrVal);
      
      for (const [name, content] of Object.entries(files)) {
        const card = document.createElement('div');
        card.className = 'preview-card';
        
        // Count lines and show file info
        const lines = content.split('\n').filter(line => line.trim()).length;
        const isKrFile = name.includes('CustAttr');
        const fileSize = (new Blob([content]).size / 1024).toFixed(1);
        
        card.innerHTML = `
          <div class="preview-header">
            <div class="preview-title">
              <i class="fa-solid fa-file-lines"></i>
              <span>${name}</span>
            </div>
            <div class="preview-badge">
              <span class="preview-lines">${lines} baris</span>
              <span class="preview-size">${fileSize} KB</span>
            </div>
          </div>
          <div class="preview-content">
            <pre>${content.substring(0, 500)}${content.length > 500 ? '\n\n...' : ''}</pre>
          </div>
          ${isKrFile && useKrVal ? '<div class="preview-notice"><i class="fa-solid fa-info-circle"></i> Format: CMPG_ID semua email → KRHRED_Unit_30 semua email → dst</div>' : ''}
        `;
        
        previewsEl.appendChild(card);
      }
    }

    // --- Events ---
    addEmailBtn.addEventListener('click', () => {
      const v = (newEmailEl.value || '').trim();
      if (!v) return;
      if (!emailRegex.test(v)) return alert('Email tidak valid.');
      if (!emails.includes(v)) {
        emails.push(v);
        ensureRowMap(v);
        renderTable();
        updateUI();
      }
      newEmailEl.value = '';
    });

    // Bulk handlers
    bulkBtn.addEventListener('click', () => {
      bulkBox.classList.toggle('hidden');
      bulkInfo.textContent = '';
    });
    cancelBulkBtn.addEventListener('click', () => {
      bulkBox.classList.add('hidden');
      bulkEmailsEl.value = '';
      bulkInfo.textContent = '';
    });
    applyBulkBtn.addEventListener('click', () => {
      const list = parseManyEmails(bulkEmailsEl.value);
      const valid = [];
      const invalid = [];
      for (const e of list) {
        if (emailRegex.test(e)) valid.push(e);
        else invalid.push(e);
      }
      // tambah yang valid & belum ada
      for (const e of valid) {
        if (!emails.includes(e)) {
          emails.push(e);
          ensureRowMap(e);
        }
      }
      renderTable();
      updateUI();

      // info singkat
      const parts = [];
      if (valid.length) parts.push(`${valid.length} email ditambahkan`);
      if (invalid.length) parts.push(`${invalid.length} invalid (diabaikan)`);
      bulkInfo.textContent = parts.join(' • ') || 'Tidak ada email baru.';
      // tetap biarkan teks paste agar bisa diperbaiki lalu Tambahkan lagi
    });

    addKeyBtn.addEventListener('click', () => {
      const key = normalizeKey(newKeyEl.value.trim());
      if (!key) return;
      if (krKeys.includes(key)) return alert('Kolom sudah ada.');
      
      // Add visual feedback
      const krhredSection = document.getElementById('krhredSection');
      krhredSection.style.transition = 'all 0.3s ease';
      krhredSection.style.background = '#f0fdf4';
      
      krKeys.push(key);
      for (const email of emails) ensureRowMap(email).set(key, '');
      newKeyEl.value = '';
      renderTable();
      updateUI();
      
      // Reset background after animation
      setTimeout(() => {
        krhredSection.style.background = '';
      }, 500);
    });

    btnDownload.addEventListener('click', async () => {
      const campaignId = campaignIdEl.value.trim();
      const useKr = campaignType === 'dynamic' && krKeys.length > 0;
      const files = buildAllFiles(campaignId, emails, useKr);
      for (const [name, content] of Object.entries(files)) {
        downloadText(name, content);
        await new Promise(r => setTimeout(r, 120));
      }
      renderDownloadLinks(files);
    });

    btnSave.addEventListener('click', async () => {
      const campaignId = campaignIdEl.value.trim();
      const useKr = campaignType === 'dynamic' && krKeys.length > 0;
      const files = buildAllFiles(campaignId, emails, useKr);
      await saveAllToFolder(files);
    });

    campaignIdEl.addEventListener('input', updateUI);

    // Campaign type change handler
    document.querySelectorAll('input[name="campaignType"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        campaignType = e.target.value;
        toggleKRHREDSection();
        
        // Clear KR keys if switching to static
        if (campaignType === 'static') {
          krKeys = [];
          renderTable();
        }
        
        updateUI();
      });
    });

    // Toggle KRHRED section visibility
    function toggleKRHREDSection() {
      if (krhredSection) {
        if (campaignType === 'dynamic') {
          krhredSection.style.display = 'block';
        } else {
          krhredSection.style.display = 'none';
        }
      }
    }

    // Init
    toggleKRHREDSection();
    renderTable();
    updateUI();
