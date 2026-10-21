/**
 * Locket Streak - Compact Account Manager Script
 */

document.addEventListener('DOMContentLoaded', async () => {

  // State
  let accounts = JSON.parse(localStorage.getItem('locket_accounts') || '[]');

  // Elements
  const barAccountCount = document.getElementById('bar-account-count');
  const accountsWrapper = document.getElementById('accounts-wrapper');

  const btnOpenModal = document.getElementById('btn-open-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const modalAddAcc = document.getElementById('modal-add-acc');

  const formAddAcc = document.getElementById('form-add-acc');
  const modalEmail = document.getElementById('modal-email');
  const modalPassword = document.getElementById('modal-password');
  const modalBtnEye = document.getElementById('modal-btn-eye');
  const modalFeedback = document.getElementById('modal-feedback');
  const modalBtnSubmit = document.getElementById('btn-modal-submit');
  const modalBtnLabel = document.getElementById('modal-btn-label');
  const modalSpinner = document.getElementById('modal-spinner');

  const btnScanAll = document.getElementById('btn-scan-all');
  const btnRunAll = document.getElementById('btn-run-all');

  // Modal Handlers
  function openModal() {
    modalAddAcc.style.display = 'flex';
    modalFeedback.style.display = 'none';
    modalEmail.focus();
  }

  function closeModal() {
    modalAddAcc.style.display = 'none';
    formAddAcc.reset();
    modalPassword.type = 'password';
    const iconShow = modalBtnEye?.querySelector('.eye-icon-show');
    const iconHide = modalBtnEye?.querySelector('.eye-icon-hide');
    if (iconShow && iconHide) {
      iconShow.style.display = 'block';
      iconHide.style.display = 'none';
    }
    modalFeedback.style.display = 'none';
  }

  btnOpenModal?.addEventListener('click', openModal);
  document.getElementById('btn-open-modal-mobile-top')?.addEventListener('click', openModal);
  btnCloseModal?.addEventListener('click', closeModal);
  btnModalCancel?.addEventListener('click', closeModal);
  modalAddAcc?.addEventListener('click', (e) => {
    if (e.target === modalAddAcc) closeModal();
  });

  modalBtnEye?.addEventListener('click', () => {
    const isPass = modalPassword.type === 'password';
    modalPassword.type = isPass ? 'text' : 'password';
    const iconShow = modalBtnEye.querySelector('.eye-icon-show');
    const iconHide = modalBtnEye.querySelector('.eye-icon-hide');
    if (iconShow && iconHide) {
      iconShow.style.display = isPass ? 'none' : 'block';
      iconHide.style.display = isPass ? 'block' : 'none';
    }
  });

  function showModalMsg(text, type = 'error') {
    modalFeedback.className = `modal-feedback ${type}`;
    modalFeedback.textContent = text;
    modalFeedback.style.display = 'block';
  }

  function setModalLoading(loading, text = 'Đang thêm...') {
    modalBtnSubmit.disabled = loading;
    modalSpinner.className = loading ? 'spinner active' : 'spinner';
    modalBtnLabel.textContent = loading ? text : 'Thêm tài khoản';
  }

  // Form Submit: Add Account
  formAddAcc.addEventListener('submit', async (e) => {
    e.preventDefault();
    modalFeedback.style.display = 'none';

    const email = modalEmail.value.trim();
    const password = modalPassword.value;

    if (!email || !email.includes('@')) {
      showModalMsg('Vui lòng nhập Email hợp lệ.', 'error');
      return;
    }
    if (!password) {
      showModalMsg('Vui lòng nhập Mật khẩu.', 'error');
      return;
    }

    setModalLoading(true, 'Đang thêm...');

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Đăng nhập thất bại.');
      }

      const info = data.data;
      const existingIdx = accounts.findIndex(a => a.uid === info.uid || a.email === info.email);

      const newAcc = {
        uid: info.uid,
        email: info.email,
        displayName: info.email.split('@')[0],
        streakCount: accounts[existingIdx]?.streakCount || 0,
        previousStreak: accounts[existingIdx]?.previousStreak || 0,
        lastStreakDate: accounts[existingIdx]?.lastStreakDate || 0,
        autoStreak: false,
        sessionSecret: info.sessionSecret || accounts[existingIdx]?.sessionSecret || null,
        firstLoginAt: info.firstLoginAt,
        lastLoginAt: info.lastLoginAt
      };

      if (existingIdx >= 0) {
        accounts[existingIdx] = { ...accounts[existingIdx], ...newAcc };
      } else {
        accounts.push(newAcc);
      }

      saveAccounts();
      renderAccounts();

      showModalMsg('Đăng nhập thành công!', 'success');
      setTimeout(() => {
        closeModal();
        syncAllAccountsFromLocket(true);
      }, 500);

    } catch (err) {
      showModalMsg(err.message, 'error');
    } finally {
      setModalLoading(false);
    }
  });

  // Render Accounts
  function saveAccounts() {
    localStorage.setItem('locket_accounts', JSON.stringify(accounts));
  }

  // Render Skeleton Loading Placeholder
  function renderSkeleton(count = 2) {
    if (!accountsWrapper) return;
    const cards = [];
    const n = Math.max(1, count);
    for (let i = 0; i < n; i++) {
      cards.push(`
        <div class="account-card skeleton-card">
          <div class="acc-card-top">
            <div class="acc-profile-group">
              <div class="skeleton-avatar skeleton-box"></div>
              <div class="acc-user-info" style="gap: 8px;">
                <div class="skeleton-box" style="width: 140px; height: 16px;"></div>
                <div class="skeleton-box" style="width: 190px; height: 12px;"></div>
              </div>
            </div>
            <div class="skeleton-pill skeleton-box"></div>
          </div>
          <div class="acc-card-bottom">
            <div class="acc-auto-switch" style="gap: 12px;">
              <div class="skeleton-toggle skeleton-box"></div>
              <div class="switch-text-group" style="gap: 6px;">
                <div class="skeleton-box" style="width: 110px; height: 14px;"></div>
                <div class="skeleton-box" style="width: 150px; height: 11px;"></div>
              </div>
            </div>
            <div class="acc-actions-row">
              <div class="skeleton-btn skeleton-box" style="width: 125px;"></div>
              <div class="skeleton-btn skeleton-box" style="width: 115px;"></div>
              <div class="skeleton-btn skeleton-box" style="width: 80px;"></div>
              <div class="skeleton-btn skeleton-box" style="width: 90px;"></div>
            </div>
          </div>
        </div>
      `);
    }
    accountsWrapper.innerHTML = cards.join('');
  }

  function renderAccounts() {
    barAccountCount.textContent = `${accounts.length} tài khoản`;

    if (accounts.length === 0) {
      accountsWrapper.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-title">Chưa có tài khoản nào</h3>
          <p class="empty-desc">Thêm tài khoản Locket để bắt đầu tự động duy trì chuỗi.</p>
          <button type="button" class="btn-main" onclick="document.getElementById('btn-open-modal').click()">+ Thêm tài khoản ngay</button>
        </div>
      `;
      return;
    }

    accountsWrapper.innerHTML = accounts.map(acc => {
      const isLinked = Boolean(acc.telegramId || acc.discordId || acc.webNotify);
      const teleButton = isLinked
        ? `<button type="button" class="acc-btn acc-btn-tele is-linked" onclick="window.openNotifyModal('${acc.uid}')">
            <svg class="acc-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Đã bật thông báo
          </button>`
        : `<button type="button" class="acc-btn acc-btn-tele" onclick="window.openNotifyModal('${acc.uid}')">
            <svg class="acc-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            Nhận thông báo
          </button>`;

      const initialChar = (acc.displayName || acc.email || 'L')[0].toUpperCase();
      const avatarHtml = acc.avatarUrl
        ? `<img src="${escapeHtml(acc.avatarUrl)}" alt="Avatar" class="acc-avatar" />`
        : `<div class="acc-avatar-fallback">${escapeHtml(initialChar)}</div>`;

      // Tính toán hiển thị chuỗi ngoài màn hình
      const todayYMD = getTodayYYYYMMDD();
      const lastDate = acc.lastStreakDate ? parseInt(acc.lastStreakDate, 10) : 0;
      const isUpdatedToday = Boolean(acc.isMaintainedToday || (lastDate && lastDate === todayYMD));

      let displayCount = acc.streakCount || 0;
      let displayDate = formatDate(lastDate);

      if (isUpdatedToday) {
        displayCount = acc.streakCount || 0;
        displayDate = formatDate(todayYMD);
      } else {
        // Tính số ngày chênh lệch giữa ngày cập nhật cuối và hôm nay
        let diffDays = 999;
        if (lastDate && String(lastDate).length === 8) {
          const str = String(lastDate);
          const y = parseInt(str.slice(0, 4), 10);
          const m = parseInt(str.slice(4, 6), 10) - 1;
          const d = parseInt(str.slice(6, 8), 10);
          const lastUtc = Date.UTC(y, m, d);

          const todayStr = String(todayYMD);
          const ty = parseInt(todayStr.slice(0, 4), 10);
          const tm = parseInt(todayStr.slice(4, 6), 10) - 1;
          const td = parseInt(todayStr.slice(6, 8), 10);
          const todayUtc = Date.UTC(ty, tm, td);

          diffDays = Math.round((todayUtc - lastUtc) / (86400 * 1000));
        }

        // Nếu chuỗi đã đứt quá hạn (> 2 ngày):
        // Hiển thị thẳng 0 ngày và lấy ngày hôm nay luôn, không hiện chuỗi cũ
        if (diffDays > 2 || !lastDate) {
          displayCount = 0;
          displayDate = formatDate(todayYMD);
        }
      }

      return `
        <div class="account-card" data-uid="${acc.uid}">
          <div class="acc-card-top">
            <div class="acc-profile-group">
              <div class="acc-avatar-wrap">
                ${avatarHtml}
              </div>
              <div class="acc-user-info">
                <div class="acc-name-row">
                  <h4 class="acc-name">${escapeHtml(acc.displayName || acc.email)}</h4>
                  ${acc.username ? `<span class="acc-username">@${escapeHtml(acc.username)}</span>` : ''}
                </div>
                <span class="acc-email">${escapeHtml(acc.email)}</span>
              </div>
            </div>

            <div class="streak-pill ${isUpdatedToday ? 'is-updated' : 'is-pending'}">
              <img src="/assets/streak.png" alt="Streak" class="streak-icon" />
              <span class="streak-number">${displayCount} ngày</span>
              <span class="streak-divider">•</span>
              <span class="streak-date">${displayDate}</span>
            </div>
          </div>

          <div class="acc-card-bottom">
            <div class="acc-auto-switch">
              <label class="toggle-switch">
                <input type="checkbox" ${acc.autoStreak ? 'checked' : ''} onclick="window.handleToggleAuto('${acc.uid}', this, event)">
                <span class="slider"></span>
              </label>
              <div class="switch-text-group">
                <span class="switch-title">Tự động giữ chuỗi</span>
                <span class="switch-sub">Tự động giữ chuỗi hàng ngày</span>
              </div>
            </div>

            <div class="acc-actions-row">
              ${teleButton}
              <button type="button" id="btn-run-${acc.uid}" class="acc-btn acc-btn-run" onclick="runManual('${acc.uid}', this)">
                <svg class="acc-btn-icon acc-icon-lightning" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <span>Chạy thủ công</span>
              </button>
              <button type="button" class="acc-btn acc-btn-detail" onclick="window.openDetailModal('${acc.uid}')" title="Xem chi tiết thông số tài khoản">
                <svg class="acc-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span>Chi tiết</span>
              </button>
              <button type="button" class="acc-btn acc-btn-delete" onclick="deleteAccount('${acc.uid}')" title="Đăng xuất tài khoản">
                <svg class="acc-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Toggle Auto (BẮT BUỘC ĐỢI API THÀNH CÔNG MỚI CHO GẠT)
  window.handleToggleAuto = async function (uid, checkboxEl, event) {
    if (event) {
      event.preventDefault(); // CẤM tự ý gạt trước!
      event.stopPropagation();
    }

    const acc = accounts.find(a => a.uid === uid);
    if (!acc) return;

    // Giữ nguyên trạng thái hiện tại trên UI, cấm tự ý gạt trước
    checkboxEl.checked = Boolean(acc.autoStreak);

    const desiredState = !acc.autoStreak;
    checkboxEl.disabled = true;

    try {
      const res = await fetch('/api/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, autoStreak: desiredState, sessionSecret: acc.sessionSecret })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Lỗi khi cập nhật tự động giữ chuỗi.');
      }

      // API thành công 100% mới cho gạt sang trạng thái mới!
      acc.autoStreak = desiredState;
      checkboxEl.checked = desiredState;
      saveAccounts();
    } catch (err) {
      alert(`Không thể cập nhật: ${err.message}`);
      checkboxEl.checked = Boolean(acc.autoStreak);
    } finally {
      checkboxEl.disabled = false;
    }
  };

  // Run Manual
  window.runManual = async function (uid, clickedBtn) {
    const acc = accounts.find(a => a.uid === uid);
    if (!acc) return;

    const btn = clickedBtn || document.getElementById(`btn-run-${uid}`);
    const originalHtml = btn ? btn.innerHTML : '';

    if (btn) {
      btn.classList.add('is-running');
      btn.innerHTML = `
        <svg class="acc-btn-icon icon-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path></svg>
        <span>Đang chạy...</span>
      `;
    }

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.cooldown) {
          if (btn) {
            btn.classList.remove('is-running');
            btn.innerHTML = originalHtml;
          }
          alert(data.message || 'Thao tác quá nhanh! Vui lòng đợi chút rồi thử lại.');
          return;
        }
        throw new Error(data.message || 'Lỗi khi cộng chuỗi.');
      }

      acc.previousStreak = acc.streakCount || 0;
      acc.streakCount = data.streakCount || (acc.streakCount + 1);
      acc.lastStreakDate = getTodayYYYYMMDD();
      acc.isMaintainedToday = true;
      saveAccounts();
      renderAccounts();

      // Hiển thị trạng thái thành công trên button mới được re-render
      const newBtn = document.getElementById(`btn-run-${uid}`);
      if (newBtn) {
        newBtn.classList.add('is-success');
        const successLabel = data.alreadyUpdated ? 'Đã có chuỗi!' : 'Thành công!';
        newBtn.innerHTML = `
          <svg class="acc-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>${successLabel}</span>
        `;
        setTimeout(() => {
          if (newBtn) {
            newBtn.classList.remove('is-success');
            newBtn.innerHTML = `
              <svg class="acc-btn-icon acc-icon-lightning" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span>Chạy thủ công</span>
            `;
          }
        }, 1800);
      }

    } catch (err) {
      console.error('[Run Manual] Lỗi:', err.message);
      if (btn) {
        btn.classList.remove('is-running');
        btn.classList.add('is-error');
        btn.innerHTML = `
          <svg class="acc-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          <span>Thất bại</span>
        `;
        setTimeout(() => {
          btn.classList.remove('is-error');
          btn.innerHTML = originalHtml;
        }, 2000);
      }
    }
  };

  // Delete Account (Đăng xuất tài khoản)
  window.deleteAccount = async function (uid) {
    const acc = accounts.find(a => a.uid === uid);
    if (!acc) return;
    if (!confirm(`Bạn có chắc muốn đăng xuất tài khoản "${acc.displayName || acc.email}" khỏi thiết bị này không?`)) return;

    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, sessionSecret: acc.sessionSecret })
      });
    } catch (err) {
      console.warn('[Logout] Lỗi gọi API logout:', err.message);
    }

    accounts = accounts.filter(a => a.uid !== uid);
    saveAccounts();
    renderAccounts();
  };

  // Lấy dữ liệu chuỗi thời gian thực cho 1 tài khoản từ /api/streak
  async function fetchAccountStreak(uid) {
    try {
      const res = await fetch('/api/streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.warn(`[Streak] Không thể tải chuỗi UID ${uid}:`, data.message);
        return null;
      }
      return data.data;
    } catch (err) {
      console.warn(`[Streak] Lỗi kết nối /api/streak:`, err);
      return null;
    }
  }

  // Đồng bộ dữ liệu tài khoản hàng loạt qua API /api/accounts duy nhất
  async function syncAllAccountsFromLocket(silent = false) {
    if (accounts.length === 0) return;

    if (!silent && btnScanAll) {
      btnScanAll.disabled = true;
      btnScanAll.classList.add('is-spinning');
      const scanLabel = document.getElementById('btn-scan-label');
      if (scanLabel) scanLabel.textContent = 'Đang quét...';
    }

    try {
      const uids = accounts.map(a => a.uid).filter(Boolean);
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uids,
          syncLive: !silent
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success && Array.isArray(resData.data)) {
        let hasChanges = false;
        resData.data.forEach(freshAcc => {
          const idx = accounts.findIndex(a => a.uid === freshAcc.uid);
          if (idx >= 0) {
            accounts[idx] = { ...accounts[idx], ...freshAcc };
            hasChanges = true;
          }
        });

        if (hasChanges) {
          saveAccounts();
          renderAccounts();
        }
      } else {
        throw new Error(resData.message || 'Lỗi lấy dữ liệu batch accounts');
      }
    } catch (err) {
      console.warn('[SyncAll] Lỗi batch /api/accounts, sử dụng fallback tuần tự:', err.message);
      // Fallback gọi lẻ nếu cần
      let hasChanges = false;
      for (const acc of accounts) {
        if (!acc.uid) continue;
        const streakData = await fetchAccountStreak(acc.uid);
        if (streakData) {
          if (streakData.profile) {
            if (streakData.profile.displayName) acc.displayName = streakData.profile.displayName;
            if (streakData.profile.username) acc.username = streakData.profile.username;
            if (streakData.profile.avatarUrl) acc.avatarUrl = streakData.profile.avatarUrl;
          }
          if (streakData.streak) {
            acc.streakCount = streakData.streak.count ?? 0;
            acc.lastStreakDate = streakData.streak.lastUpdated || 0;
            acc.isMaintainedToday = !!streakData.streak.isMaintainedToday;
          }
          hasChanges = true;
        }
      }
      if (hasChanges) {
        saveAccounts();
        renderAccounts();
      }
    } finally {
      if (!silent && btnScanAll) {
        btnScanAll.disabled = false;
        btnScanAll.classList.remove('is-spinning');
        const scanLabel = document.getElementById('btn-scan-label');
        if (scanLabel) scanLabel.textContent = 'Quét lại';
      }
    }
  }

  // Scan All button
  btnScanAll?.addEventListener('click', async () => {
    if (accounts.length === 0) return alert('Chưa có tài khoản nào.');
    renderSkeleton(accounts.length);
    await syncAllAccountsFromLocket(false);
    renderAccounts();
  });

  // Run All (Chạy duy trì cho tất cả tài khoản với Jitter tự nhiên)
  btnRunAll?.addEventListener('click', async () => {
    if (accounts.length === 0) return alert('Chưa có tài khoản nào.');
    if (btnRunAll.disabled) return;

    btnRunAll.disabled = true;
    const runLabel = document.getElementById('btn-run-all-label');
    const originalLabel = runLabel ? runLabel.textContent : 'Chạy tất cả';

    try {
      for (let i = 0; i < accounts.length; i++) {
        const acc = accounts[i];
        if (runLabel) runLabel.textContent = `Đang chạy (${i + 1}/${accounts.length})...`;
        await window.runManual(acc.uid);

        // Nghỉ ngẫu nhiên 1.0s - 2.0s giữa các tài khoản để tránh dội bom Locket
        if (i < accounts.length - 1) {
          const jitter = Math.floor(Math.random() * 1000) + 1000;
          await new Promise(r => setTimeout(r, jitter));
        }
      }
      if (runLabel) runLabel.textContent = 'Đã hoàn tất!';
      setTimeout(() => {
        if (runLabel) runLabel.textContent = originalLabel;
        btnRunAll.disabled = false;
      }, 1800);
    } catch (_) {
      if (runLabel) runLabel.textContent = originalLabel;
      btnRunAll.disabled = false;
    }
  });

  // === Notification Modal Management ===
  const modalNotify = document.getElementById('modal-notify');
  const notifyModalUser = document.getElementById('notify-modal-user');
  const btnCloseNotifyModal = document.getElementById('btn-close-notify-modal');
  const btnCloseNotifyDone = document.getElementById('btn-close-notify-done');

  const toggleNotifyWeb = document.getElementById('toggle-notify-web');

  const toggleNotifyTele = document.getElementById('toggle-notify-tele');
  const teleExpandBox = document.getElementById('tele-expand-box');
  const teleUnlinkedView = document.getElementById('tele-unlinked-view');
  const teleLinkedView = document.getElementById('tele-linked-view');
  const teleConnectedId = document.getElementById('tele-connected-id');
  const btnOpenTelegramBot = document.getElementById('btn-open-telegram-bot');
  const btnCheckTelegramLink = document.getElementById('btn-check-telegram-link');
  const teleCheckIcon = document.getElementById('tele-check-icon') || document.getElementById('tele-check-spinner');
  const teleCheckLabel = document.getElementById('tele-check-label');

  const ICON_SPINNER_SVG = `<svg class="icon-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="9" stroke-opacity="0.25"></circle><path d="M12 3a9 9 0 0 1 9 9"></path></svg>`;
  const ICON_ERROR_X_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  const ICON_SUCCESS_V_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  const toggleNotifyDiscord = document.getElementById('toggle-notify-discord');
  const discordExpandBox = document.getElementById('discord-expand-box');
  const discordUnlinkedView = document.getElementById('discord-unlinked-view');
  const discordLinkedView = document.getElementById('discord-linked-view');
  const discordWebhookUrl = document.getElementById('discord-webhook-url');
  const btnSaveDiscordWebhook = document.getElementById('btn-save-discord-webhook');
  const discordSaveSpinner = document.getElementById('discord-save-spinner');
  const discordSaveLabel = document.getElementById('discord-save-label');

  let activeNotifyUid = null;
  let telegramBotUsername = 'LocketStreakBot';
  let teleAutoCheckTimer = null;
  let currentTeleCode = null;

  function cancelTeleAutoTimer() {
    if (teleAutoCheckTimer) {
      clearTimeout(teleAutoCheckTimer);
      teleAutoCheckTimer = null;
    }
  }

  function refreshTeleCode(acc) {
    if (!acc) return;
    // Tạo mã xác thực ngẫu nhiên 6 ký tự cho mỗi phiên mở bot (hạn 5 phút)
    currentTeleCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    if (btnOpenTelegramBot) {
      btnOpenTelegramBot.href = `https://t.me/${telegramBotUsername}?start=${acc.uid}_${currentTeleCode}`;
    }
  }

  let telegramBotUsernameLoaded = false;
  // Lấy bot username từ API Telegram khi cần (chỉ gọi 1 lần khi người dùng ấn vào kết nối bot)
  async function ensureTelegramBotInfo() {
    if (telegramBotUsernameLoaded) return;
    try {
      const r = await fetch('/api/telegram');
      const data = await r.json();
      if (data.botUsername) {
        telegramBotUsername = data.botUsername;
        telegramBotUsernameLoaded = true;
      }
    } catch (_) { }
  }

  window.openNotifyModal = async function (uid) {
    const acc = accounts.find(a => a.uid === uid);
    if (!acc) return;

    cancelTeleAutoTimer();
    activeNotifyUid = uid;

    // Set user title
    if (notifyModalUser) {
      notifyModalUser.textContent = `cho tài khoản ${acc.displayName || acc.email}`;
    }

    // Web Notification state (đọc từ DB, mặc định false)
    toggleNotifyWeb.checked = Boolean(acc.webNotify);

    // Telegram state (luôn hiển thị phần kết nối với mã xác thực 5 phút)
    if (btnCheckTelegramLink) {
      btnCheckTelegramLink.classList.remove('btn-action-error', 'btn-action-success');
      btnCheckTelegramLink.disabled = false;
    }
    if (teleCheckIcon) teleCheckIcon.innerHTML = '';
    if (teleCheckLabel) teleCheckLabel.textContent = 'Kiểm tra kết nối';

    refreshTeleCode(acc);
    if (acc.telegramId) {
      toggleNotifyTele.checked = true;
      teleLinkedView.style.display = 'block';
      teleUnlinkedView.style.display = 'none';
      teleConnectedId.textContent = acc.telegramId;
    } else {
      toggleNotifyTele.checked = false;
      teleLinkedView.style.display = 'none';
      teleUnlinkedView.style.display = 'block';
    }

    // Discord state (luôn hiển thị phần kết nối)
    if (acc.discordId) {
      toggleNotifyDiscord.checked = true;
      discordLinkedView.style.display = 'block';
      discordUnlinkedView.style.display = 'none';
    } else {
      toggleNotifyDiscord.checked = false;
      discordLinkedView.style.display = 'none';
      discordUnlinkedView.style.display = 'block';
      discordWebhookUrl.value = '';
    }

    modalNotify.style.display = 'flex';
  };

  function closeNotifyModal() {
    cancelTeleAutoTimer();
    activeNotifyUid = null;
    modalNotify.style.display = 'none';
  }

  btnCloseNotifyModal?.addEventListener('click', closeNotifyModal);
  btnCloseNotifyDone?.addEventListener('click', closeNotifyModal);
  modalNotify?.addEventListener('click', (e) => {
    if (e.target === modalNotify) closeNotifyModal();
  });

  // Toggle Web Notifications (BẮT BUỘC ĐỢI API THÀNH CÔNG MỚI CHO GẠT)
  toggleNotifyWeb?.addEventListener('click', async (e) => {
    e.preventDefault(); // CẤM tự ý gạt trước!
    e.stopPropagation();

    const acc = accounts.find(a => a.uid === activeNotifyUid);
    if (!acc) return;

    // Giữ nguyên trạng thái hiện tại trên UI, cấm tự ý gạt trước
    toggleNotifyWeb.checked = Boolean(acc.webNotify);

    const desiredState = !acc.webNotify;
    toggleNotifyWeb.disabled = true;

    try {
      if (desiredState) {
        if (!('Notification' in window)) {
          throw new Error('Trình duyệt này không hỗ trợ hiển thị thông báo.');
        }

        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          throw new Error('Bạn chưa cấp quyền thông báo trên trình duyệt.');
        }

        const res = await fetch('/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: acc.uid, webNotify: true })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Lỗi khi lưu cài đặt thông báo.');
        }

        // 100% API thành công mới cho gạt sang BẬT!
        acc.webNotify = true;
        toggleNotifyWeb.checked = true;
        saveAccounts();
        renderAccounts();
      } else {
        const res = await fetch('/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: acc.uid, webNotify: false })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Lỗi khi lưu cài đặt thông báo.');
        }

        // 100% API thành công mới cho gạt sang TẮT!
        acc.webNotify = false;
        toggleNotifyWeb.checked = false;
        saveAccounts();
        renderAccounts();
      }
    } catch (err) {
      toggleNotifyWeb.checked = Boolean(acc.webNotify);
    } finally {
      toggleNotifyWeb.disabled = false;
    }
  });

  // Toggle Telegram: Không cho phép gạt BẬT nếu chưa có ID (ĐỢI API HUỶ NẾU TẮT)
  toggleNotifyTele?.addEventListener('click', async (e) => {
    e.preventDefault(); // CẤM tự ý gạt trước!
    e.stopPropagation();

    const acc = accounts.find(a => a.uid === activeNotifyUid);
    if (!acc) return;

    // Giữ nguyên trạng thái hiện tại trên UI, cấm tự ý gạt trước
    toggleNotifyTele.checked = Boolean(acc.telegramId);

    if (!acc.telegramId) {
      toggleNotifyTele.checked = false;
      return;
    }

    // Nếu đã có ID và người dùng bấm để gạt TẮT -> đợi API huỷ
    cancelTeleAutoTimer();
    toggleNotifyTele.disabled = true;
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlink', uid: acc.uid })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Lỗi huỷ liên kết Telegram.');
      }

      // 100% API thành công mới cho gạt sang TẮT!
      toggleNotifyTele.checked = false;
      acc.telegramId = null;
      saveAccounts();
      renderAccounts();

      teleLinkedView.style.display = 'none';
      teleUnlinkedView.style.display = 'block';
      refreshTeleCode(acc);
    } catch (err) {
      toggleNotifyTele.checked = true;
    } finally {
      toggleNotifyTele.disabled = false;
    }
  });

  // Khi bấm "Mở Telegram Bot": tạo mã mới hạn 5 phút, hẹn giờ 10 giây sau tự gọi API check 1 lần duy nhất
  btnOpenTelegramBot?.addEventListener('click', async () => {
    cancelTeleAutoTimer();
    const acc = accounts.find(a => a.uid === activeNotifyUid);
    if (!acc) return;

    if (!telegramBotUsernameLoaded) {
      await ensureTelegramBotInfo();
    }
    refreshTeleCode(acc);

    teleAutoCheckTimer = setTimeout(async () => {
      teleAutoCheckTimer = null;
      const currentAcc = accounts.find(a => a.uid === activeNotifyUid);
      // Chỉ tự check đúng 1 lần nếu modal vẫn mở và chưa liên kết
      if (currentAcc && !currentAcc.telegramId && modalNotify.style.display !== 'none') {
        await checkTelegramStatus(true);
      }
    }, 10000);
  });

  // Kiểm tra kết nối Telegram (gọi 1 lần sau 10s hoặc khi người dùng chủ động bấm)
  async function checkTelegramStatus(isAuto = false) {
    cancelTeleAutoTimer(); // Huỷ timer chờ nếu người dùng hoặc hệ thống đã check

    const acc = accounts.find(a => a.uid === activeNotifyUid);
    if (!acc) return;

    // 1. Trạng thái Đang kiểm tra: Hiện icon xoay
    btnCheckTelegramLink.disabled = true;
    btnCheckTelegramLink.classList.remove('btn-action-error', 'btn-action-success');
    if (teleCheckIcon) teleCheckIcon.innerHTML = ICON_SPINNER_SVG;
    if (teleCheckLabel) teleCheckLabel.textContent = 'Đang kiểm tra...';

    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', uid: acc.uid, teleCode: currentTeleCode })
      });
      const data = await res.json();

      if (data.success && data.linked) {
        // 2. Trạng thái Thành công: Hiện icon V (checkmark)
        acc.telegramId = data.telegramId;
        currentTeleCode = null; // Mã đã sử dụng thành công
        saveAccounts();
        renderAccounts();

        btnCheckTelegramLink.classList.remove('btn-action-error');
        btnCheckTelegramLink.classList.add('btn-action-success');
        if (teleCheckIcon) teleCheckIcon.innerHTML = ICON_SUCCESS_V_SVG;
        if (teleCheckLabel) teleCheckLabel.textContent = 'Thành công';

        setTimeout(() => {
          btnCheckTelegramLink.classList.remove('btn-action-success');
          if (teleCheckIcon) teleCheckIcon.innerHTML = '';
          if (teleCheckLabel) teleCheckLabel.textContent = 'Kiểm tra kết nối';
          btnCheckTelegramLink.disabled = false;

          toggleNotifyTele.checked = true;
          teleUnlinkedView.style.display = 'none';
          teleLinkedView.style.display = 'block';
          teleConnectedId.textContent = data.senderName ? `${data.senderName} (${data.telegramId})` : data.telegramId;
        }, 900);
      } else {
        // 3. Trạng thái Thất bại: Chuyển màu đỏ và hiện icon X
        btnCheckTelegramLink.classList.remove('btn-action-success');
        btnCheckTelegramLink.classList.add('btn-action-error');
        if (teleCheckIcon) teleCheckIcon.innerHTML = ICON_ERROR_X_SVG;
        if (teleCheckLabel) teleCheckLabel.textContent = 'Chưa được...';

        setTimeout(() => {
          btnCheckTelegramLink.classList.remove('btn-action-error');
          if (teleCheckIcon) teleCheckIcon.innerHTML = '';
          if (teleCheckLabel) teleCheckLabel.textContent = 'Kiểm tra kết nối';
          btnCheckTelegramLink.disabled = false;
        }, 2000);
      }
    } catch (_) {
      // 3. Trạng thái Thất bại do lỗi mạng: Chuyển màu đỏ và hiện icon X
      btnCheckTelegramLink.classList.remove('btn-action-success');
      btnCheckTelegramLink.classList.add('btn-action-error');
      if (teleCheckIcon) teleCheckIcon.innerHTML = ICON_ERROR_X_SVG;
      if (teleCheckLabel) teleCheckLabel.textContent = 'Chưa được...';

      setTimeout(() => {
        btnCheckTelegramLink.classList.remove('btn-action-error');
        if (teleCheckIcon) teleCheckIcon.innerHTML = '';
        if (teleCheckLabel) teleCheckLabel.textContent = 'Kiểm tra kết nối';
        btnCheckTelegramLink.disabled = false;
      }, 2000);
    }
  }

  btnCheckTelegramLink?.addEventListener('click', () => checkTelegramStatus(false));

  // Toggle Discord: Không cho phép gạt BẬT nếu chưa có Webhook URL (BẮT BUỘC ĐỢI API)
  toggleNotifyDiscord?.addEventListener('click', async (e) => {
    e.preventDefault(); // CẤM tự ý gạt trước!
    e.stopPropagation();

    const acc = accounts.find(a => a.uid === activeNotifyUid);
    if (!acc) return;

    // Giữ nguyên trạng thái hiện tại trên UI, cấm tự ý gạt trước
    toggleNotifyDiscord.checked = Boolean(acc.discordId);

    if (!acc.discordId) {
      toggleNotifyDiscord.checked = false;
      return;
    }

    // Nếu đã có Webhook và người dùng bấm để gạt TẮT -> đợi API huỷ
    toggleNotifyDiscord.disabled = true;
    try {
      const res = await fetch('/api/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlink', uid: acc.uid })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Lỗi khi huỷ liên kết Discord.');
      }

      // 100% API thành công mới cho gạt sang TẮT!
      acc.discordId = null;
      toggleNotifyDiscord.checked = false;
      discordWebhookUrl.value = '';
      saveAccounts();
      renderAccounts();

      discordLinkedView.style.display = 'none';
      discordUnlinkedView.style.display = 'block';
    } catch (err) {
      toggleNotifyDiscord.checked = true;
    } finally {
      toggleNotifyDiscord.disabled = false;
    }
  });

  // Save Discord Webhook
  btnSaveDiscordWebhook?.addEventListener('click', async () => {
    const acc = accounts.find(a => a.uid === activeNotifyUid);
    if (!acc) return;

    const webhookUrl = (discordWebhookUrl.value || '').trim();
    if (!webhookUrl) {
      btnSaveDiscordWebhook.classList.add('btn-action-error');
      if (discordSaveLabel) discordSaveLabel.textContent = 'Chưa được...';
      setTimeout(() => {
        btnSaveDiscordWebhook.classList.remove('btn-action-error');
        if (discordSaveLabel) discordSaveLabel.textContent = 'Kiểm tra & Lưu';
      }, 2000);
      return;
    }

    discordSaveSpinner.classList.add('active');
    btnSaveDiscordWebhook.disabled = true;
    btnSaveDiscordWebhook.classList.remove('btn-action-error');
    if (discordSaveLabel) discordSaveLabel.textContent = 'Đang lưu...';

    try {
      const res = await fetch('/api/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link', uid: acc.uid, webhookUrl })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        acc.discordId = webhookUrl;
        saveAccounts();
        renderAccounts();

        toggleNotifyDiscord.checked = true;
        discordUnlinkedView.style.display = 'none';
        discordLinkedView.style.display = 'block';
      } else {
        discordSaveSpinner.classList.remove('active');
        btnSaveDiscordWebhook.classList.add('btn-action-error');
        if (discordSaveLabel) discordSaveLabel.textContent = 'Chưa được...';
        setTimeout(() => {
          btnSaveDiscordWebhook.classList.remove('btn-action-error');
          if (discordSaveLabel) discordSaveLabel.textContent = 'Kiểm tra & Lưu';
          btnSaveDiscordWebhook.disabled = false;
        }, 2000);
        return;
      }
    } catch (_) {
      discordSaveSpinner.classList.remove('active');
      btnSaveDiscordWebhook.classList.add('btn-action-error');
      if (discordSaveLabel) discordSaveLabel.textContent = 'Chưa được...';
      setTimeout(() => {
        btnSaveDiscordWebhook.classList.remove('btn-action-error');
        if (discordSaveLabel) discordSaveLabel.textContent = 'Kiểm tra & Lưu';
        btnSaveDiscordWebhook.disabled = false;
      }, 2000);
      return;
    } finally {
      discordSaveSpinner.classList.remove('active');
      if (!btnSaveDiscordWebhook.classList.contains('btn-action-error')) {
        if (discordSaveLabel) discordSaveLabel.textContent = 'Kiểm tra & Lưu';
        btnSaveDiscordWebhook.disabled = false;
      }
    }
  });

  // Helpers
  function getTodayYYYYMMDD() {
    const vnTime = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
    const y = vnTime.getUTCFullYear();
    const m = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
    const d = String(vnTime.getUTCDate()).padStart(2, '0');
    return parseInt(`${y}${m}${d}`, 10);
  }

  function formatDate(num) {
    if (!num || num <= 19700101 || String(num).startsWith('1970')) {
      num = getTodayYYYYMMDD();
    }
    const s = String(num);
    if (s.length !== 8) return s;
    return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  // Mobile Menu Drawer Handler
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenuDrawer = document.getElementById('mobileMenuDrawer');
  const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');
  const mobileBtnOpenModal = document.getElementById('mobile-btn-open-modal');

  function toggleMobileMenu(force) {
    if (!mobileMenuBtn || !mobileMenuDrawer) return;
    const isOpen = force !== undefined ? force : !mobileMenuDrawer.classList.contains('is-open');
    mobileMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    mobileMenuDrawer.classList.toggle('is-open', isOpen);
    mobileMenuDrawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => toggleMobileMenu());
  }
  if (mobileMenuBackdrop) {
    mobileMenuBackdrop.addEventListener('click', () => toggleMobileMenu(false));
  }
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.addEventListener('click', () => toggleMobileMenu(false));
  });
  if (mobileBtnOpenModal) {
    mobileBtnOpenModal.addEventListener('click', () => {
      toggleMobileMenu(false);
      openModal();
    });
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalAddAcc && modalAddAcc.style.display !== 'none') closeModal();
      if (modalNotify && modalNotify.style.display !== 'none') closeNotifyModal();
      if (modalDetail && modalDetail.style.display !== 'none') closeDetailModal();
      if (mobileMenuDrawer && mobileMenuDrawer.classList.contains('is-open')) {
        toggleMobileMenu(false);
      }
    }
  });

  // ==========================================================================
  // Modal: Chi Tiết Tài Khoản & Dữ Liệu DB
  // ==========================================================================
  const modalDetail = document.getElementById('modal-detail');
  const detailModalUser = document.getElementById('detail-modal-user');
  const detailModalBody = document.getElementById('detail-modal-body');
  const btnCloseDetailModal = document.getElementById('btn-close-detail-modal');
  const btnCloseDetailDone = document.getElementById('btn-close-detail-done');

  function closeDetailModal() {
    if (modalDetail) modalDetail.style.display = 'none';
  }

  if (btnCloseDetailModal) btnCloseDetailModal.addEventListener('click', closeDetailModal);
  if (btnCloseDetailDone) btnCloseDetailDone.addEventListener('click', closeDetailModal);
  if (modalDetail) {
    modalDetail.addEventListener('click', (e) => {
      if (e.target === modalDetail) closeDetailModal();
    });
  }

  function formatFullDateTime(val) {
    if (!val) return 'Chưa ghi nhận';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds} • ${day}/${month}/${year}`;
    } catch (_) {
      return String(val);
    }
  }

  window.openDetailModal = async function (uid) {
    const acc = accounts.find(a => a.uid === uid);
    if (!acc || !modalDetail) return;

    if (detailModalUser) {
      detailModalUser.textContent = `cho tài khoản ${acc.displayName || acc.email}`;
    }

    modalDetail.style.display = 'flex';
    if (detailModalBody) {
      detailModalBody.innerHTML = `
        <div class="detail-grid">
          <div class="detail-section">
            <div class="skeleton-box" style="width: 140px; height: 13px; margin-bottom: 8px;"></div>
            <div class="detail-box skeleton-card" style="gap: 12px; padding: 16px 18px;">
              <div class="skeleton-box" style="width: 100%; height: 20px;"></div>
              <div class="skeleton-box" style="width: 80%; height: 20px;"></div>
              <div class="skeleton-box" style="width: 88%; height: 20px;"></div>
              <div class="skeleton-box" style="width: 65%; height: 20px;"></div>
            </div>
          </div>
          <div class="detail-section">
            <div class="skeleton-box" style="width: 130px; height: 13px; margin-bottom: 8px;"></div>
            <div class="detail-box skeleton-card" style="gap: 12px; padding: 16px 18px;">
              <div class="skeleton-box" style="width: 100%; height: 20px;"></div>
              <div class="skeleton-box" style="width: 70%; height: 20px;"></div>
              <div class="skeleton-box" style="width: 85%; height: 20px;"></div>
              <div class="skeleton-box" style="width: 60%; height: 20px;"></div>
            </div>
          </div>
          <div class="detail-section">
            <div class="skeleton-box" style="width: 150px; height: 13px; margin-bottom: 8px;"></div>
            <div class="detail-box skeleton-card" style="gap: 12px; padding: 16px 18px;">
              <div class="skeleton-box" style="width: 100%; height: 20px;"></div>
              <div class="skeleton-box" style="width: 90%; height: 20px;"></div>
              <div class="skeleton-box" style="width: 80%; height: 20px;"></div>
              <div class="skeleton-box" style="width: 70%; height: 20px;"></div>
            </div>
          </div>
          <div class="detail-section">
            <div class="skeleton-box" style="width: 160px; height: 13px; margin-bottom: 8px;"></div>
            <div class="detail-box skeleton-card" style="gap: 12px; padding: 16px 18px;">
              <div class="skeleton-box" style="width: 100%; height: 20px;"></div>
              <div class="skeleton-box" style="width: 78%; height: 20px;"></div>
              <div class="skeleton-box" style="width: 85%; height: 20px;"></div>
              <div class="skeleton-box" style="width: 62%; height: 20px;"></div>
            </div>
          </div>
        </div>
      `;
    }

    let detailData = null;
    try {
      const res = await fetch('/api/streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      });
      const json = await res.json();
      if (json && json.success && json.data) {
        detailData = json.data;
      }
    } catch (err) {
      console.warn('[Detail] Lỗi tải từ /api/streak:', err.message);
    }

    // Kết hợp dữ liệu từ API và dữ liệu local
    const profile = detailData?.profile || {};
    const streak = detailData?.streak || {};
    const settings = detailData?.settings || {};
    const stats = detailData?.stats || {};

    const displayName = profile.displayName || acc.displayName || acc.email;
    const username = profile.username || acc.username;
    const email = detailData?.email || acc.email || 'N/A';
    const streakCount = streak.count !== undefined ? streak.count : (acc.streakCount || 0);
    const lastDate = streak.rawLastUpdated || streak.lastUpdated || acc.lastStreakDate || 0;

    const todayYMD = getTodayYYYYMMDD();
    let diffDays = 999;
    if (lastDate && String(lastDate).length === 8) {
      const str = String(lastDate);
      const y = parseInt(str.slice(0, 4), 10);
      const m = parseInt(str.slice(4, 6), 10) - 1;
      const d = parseInt(str.slice(6, 8), 10);
      const lastUtc = Date.UTC(y, m, d);

      const todayStr = String(todayYMD);
      const ty = parseInt(todayStr.slice(0, 4), 10);
      const tm = parseInt(todayStr.slice(4, 6), 10) - 1;
      const td = parseInt(todayStr.slice(6, 8), 10);
      const todayUtc = Date.UTC(ty, tm, td);

      diffDays = Math.round((todayUtc - lastUtc) / (86400 * 1000));
    }

    const isUpdatedToday = Boolean(streak.isMaintainedToday || (lastDate && lastDate === todayYMD) || acc.isMaintainedToday);
    const isDead = diffDays > 2;

    let streakStatusBadge = '';
    if (isUpdatedToday) {
      streakStatusBadge = '<span class="detail-badge badge-success">Đã duy trì hôm nay</span>';
    } else if (isDead) {
      streakStatusBadge = '<span class="detail-badge badge-danger">Đã mất chuỗi (> 2 ngày)</span>';
    } else {
      streakStatusBadge = '<span class="detail-badge badge-warning">Cần duy trì / Có thể khôi phục</span>';
    }

    let lastRunBadge = '<span class="detail-badge badge-neutral">Chưa có lượt chạy</span>';
    if (stats.lastStreakStatus === 'success') {
      lastRunBadge = '<span class="detail-badge badge-success">Thành công</span>';
    } else if (stats.lastStreakStatus === 'already_updated' || stats.lastStreakStatus === 'skipped') {
      lastRunBadge = '<span class="detail-badge badge-success">Đã có chuỗi</span>';
    } else if (stats.lastStreakStatus === 'error') {
      lastRunBadge = '<span class="detail-badge badge-danger">Thất bại</span>';
    }

    detailModalBody.innerHTML = `
      <div class="detail-grid">
        <div class="detail-section">
          <span class="detail-section-title">1. Thông tin tài khoản</span>
          <div class="detail-box">
            <div class="detail-row">
              <span class="detail-label">Mã UID</span>
              <span class="detail-val detail-val-uid">
                <code class="detail-uid-code" title="${escapeHtml(uid)}">${escapeHtml(uid)}</code>
                <button type="button" class="btn-copy-uid" onclick="navigator.clipboard.writeText('${escapeHtml(uid)}'); this.textContent = '✓'; setTimeout(() => this.textContent = 'Copy', 1500);" title="Sao chép UID">Copy</button>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Username</span>
              <span class="detail-val" title="${username ? '@' + escapeHtml(username) : ''}">${username ? '@' + escapeHtml(username) : '<em>Chưa đặt</em>'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email</span>
              <span class="detail-val" title="${escapeHtml(email)}">${escapeHtml(email)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Tên hiển thị</span>
              <span class="detail-val" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <span class="detail-section-title">2. Thông số chuỗi</span>
          <div class="detail-box">
            <div class="detail-row">
              <span class="detail-label">Trạng thái hiện tại</span>
              <span class="detail-val">${streakStatusBadge}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Chuỗi ghi nhận</span>
              <span class="detail-val"><strong>${streakCount} ngày</strong></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Lần ghi nhận cuối</span>
              <span class="detail-val"><strong>${formatDate(lastDate)}</strong></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Khoảng cách ngày</span>
              <span class="detail-val">${diffDays === 0 ? 'Hôm nay' : (diffDays < 999 ? `Trễ ${diffDays} ngày (${isDead ? 'Hết hạn' : 'Có thể cứu'})` : 'Chưa rõ')}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <span class="detail-section-title">3. Lịch sử hoạt động</span>
          <div class="detail-box">
            <div class="detail-row">
              <span class="detail-label">Ngày bắt đầu sử dụng</span>
              <span class="detail-val">${formatFullDateTime(stats.createdAt || stats.firstLoginAt || acc.firstLoginAt)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Làm mới phiên gần nhất</span>
              <span class="detail-val">${formatFullDateTime(stats.tokenUpdatedAt || stats.lastLoginAt)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Lần chạy chuỗi cuối cùng</span>
              <span class="detail-val">${formatFullDateTime(stats.lastStreakRunAt)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Kết quả chạy gần nhất</span>
              <span class="detail-val">${lastRunBadge}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <span class="detail-section-title">4. Dịch vụ &amp; Thông báo</span>
          <div class="detail-box">
            <div class="detail-row">
              <span class="detail-label">Tự động giữ chuỗi</span>
              <span class="detail-val">${(settings.autoStreak ?? acc.autoStreak) ? '<span class="detail-badge badge-success">Đang bật</span>' : '<span class="detail-badge badge-neutral">Đang tắt</span>'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Telegram Thông báo</span>
              <span class="detail-val">${(settings.telegramId || acc.telegramId) ? `<span class="detail-badge badge-success">Đã kết nối</span>` : '<span class="detail-badge badge-neutral">Chưa kết nối</span>'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Discord Webhook</span>
              <span class="detail-val">${(settings.discordWebhook || settings.discordId || acc.discordId) ? '<span class="detail-badge badge-success">Đã kết nối</span>' : '<span class="detail-badge badge-neutral">Chưa kết nối</span>'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Thông báo Web Push</span>
              <span class="detail-val">${(settings.webNotify ?? acc.webNotify) ? '<span class="detail-badge badge-success">Bật</span>' : '<span class="detail-badge badge-neutral">Tắt</span>'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Hiển thị hiệu ứng skeleton loading mượt mà trên dashboard
  if (accounts.length > 0) {
    renderSkeleton(accounts.length);
    setTimeout(() => {
      renderAccounts();
      syncAllAccountsFromLocket(true);
    }, 380);
  } else {
    renderAccounts();
  }
});
