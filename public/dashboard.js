/**
 * Locket Streak - Compact Account Manager Script
 */

document.addEventListener('DOMContentLoaded', async () => {

  // Helper quản lý sessionSecret độc lập trong localStorage để không bao giờ bị ghi đè hay mất khi sync API
  function getStoredSessionSecrets() {
    try {
      return JSON.parse(localStorage.getItem('locket_session_secrets') || '{}');
    } catch {
      return {};
    }
  }

  function saveSessionSecret(uid, secret) {
    if (!uid || !secret) return;
    const secrets = getStoredSessionSecrets();
    secrets[uid] = secret;
    localStorage.setItem('locket_session_secrets', JSON.stringify(secrets));
  }

  function getSessionSecret(uid) {
    if (!uid) return null;
    const secrets = getStoredSessionSecrets();
    return secrets[uid] || null;
  }

  function removeSessionSecret(uid) {
    if (!uid) return;
    const secrets = getStoredSessionSecrets();
    delete secrets[uid];
    localStorage.setItem('locket_session_secrets', JSON.stringify(secrets));
  }

  function clearAccountCache(uid) {
    if (!uid) return;
    removeSessionSecret(uid);
    localStorage.removeItem('locket_webpush_' + uid);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.includes(uid) || key.startsWith(`locket_${uid}`))) {
        localStorage.removeItem(key);
      }
    }
  }

  // State: Khôi phục và đảm bảo mọi tài khoản đều gắn với sessionSecret tương ứng
  let accounts = JSON.parse(localStorage.getItem('locket_accounts') || '[]');
  accounts.forEach(acc => {
    if (acc && acc.uid) {
      if (acc.sessionSecret) {
        saveSessionSecret(acc.uid, acc.sessionSecret);
      } else {
        const storedSec = getSessionSecret(acc.uid);
        if (storedSec) acc.sessionSecret = storedSec;
      }
    }
  });

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
    if (modalBtnLabel) {
      modalBtnLabel.textContent = 'Thêm tài khoản';
    }
    const titleEl = modalAddAcc.querySelector('.modal-title');
    if (titleEl) {
      titleEl.textContent = 'Thêm tài khoản Locket';
    }
  }

  // Mở modal đăng nhập lại cho tài khoản hết hạn phiên
  window.openReloginModal = function (uid, email) {
    if (modalAddAcc) {
      modalAddAcc.style.display = 'flex';
      modalFeedback.style.display = 'none';
      if (modalEmail && email) {
        modalEmail.value = email;
      }
      if (modalBtnLabel) {
        modalBtnLabel.textContent = 'Cập nhật phiên';
      }
      const titleEl = modalAddAcc.querySelector('.modal-title');
      if (titleEl) {
        titleEl.textContent = 'Đăng nhập lại tài khoản';
      }
      if (modalPassword) {
        modalPassword.value = '';
        modalPassword.focus();
      }
    }
  };

  btnOpenModal?.addEventListener('click', openModal);
  document.getElementById('btn-open-modal-mobile-top')?.addEventListener('click', openModal);
  btnCloseModal?.addEventListener('click', closeModal);
  btnModalCancel?.addEventListener('click', closeModal);

  /**
   * Đóng modal an toàn khi click backdrop bên ngoài:
   * Chỉ đóng khi CẢ mousedown VÀ mouseup đều xuất phát và kết thúc trực tiếp trên backdrop.
   * Ngăn chặn triệt để tình trạng:
   * - Bôi đen (drag text) trong ô input thả chuột ra ngoài backdrop bị tự tắt modal.
   * - Chuyển từ tab khác sang hoặc click giữa các ô input bị vô tình đóng modal.
   */
  function setupSafeBackdropDismiss(modalOverlay, closeFn) {
    if (!modalOverlay) return;
    let isBackdropMouseDown = false;

    modalOverlay.addEventListener('mousedown', (e) => {
      isBackdropMouseDown = (e.target === modalOverlay);
    });

    modalOverlay.addEventListener('mouseup', (e) => {
      if (isBackdropMouseDown && e.target === modalOverlay) {
        closeFn();
      }
      isBackdropMouseDown = false;
    });

    modalOverlay.addEventListener('click', (e) => {
      if (e.target !== modalOverlay) {
        e.stopPropagation();
      }
    });

    const card = modalOverlay.querySelector('.modal-card');
    if (card) {
      card.addEventListener('mousedown', (e) => {
        isBackdropMouseDown = false;
        e.stopPropagation();
      });
      card.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    window.addEventListener('blur', () => {
      isBackdropMouseDown = false;
    });
  }

  setupSafeBackdropDismiss(modalAddAcc, closeModal);

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
      // Tìm tài khoản theo UID duy nhất (UID là bất biến, kể cả khi đổi email, đổi mật khẩu hay đổi tên)
      const existingIdx = accounts.findIndex(a => a.uid === info.uid || (a.email && info.email && a.email.toLowerCase() === info.email.toLowerCase()));

      const prev = existingIdx >= 0 ? accounts[existingIdx] : {};
      const secret = info.sessionSecret || prev.sessionSecret || getSessionSecret(info.uid) || null;
      if (secret) {
        saveSessionSecret(info.uid, secret);
      }

      const updatedAcc = {
        uid: info.uid,
        email: info.email || prev.email,
        displayName: info.displayName || prev.displayName || (info.email ? info.email.split('@')[0] : 'Người dùng'),
        username: info.username || prev.username || null,
        avatarUrl: info.avatarUrl || prev.avatarUrl || null,
        streakCount: info.streakCount !== undefined ? info.streakCount : (prev.streakCount || 0),
        previousStreak: prev.previousStreak || 0,
        lastStreakDate: info.lastStreakDate !== undefined ? info.lastStreakDate : (prev.lastStreakDate || 0),
        autoStreak: info.autoStreak !== undefined ? info.autoStreak : (prev.autoStreak ?? false),
        telegramId: info.telegramId !== undefined ? info.telegramId : (prev.telegramId || null),
        discordId: info.discordId !== undefined ? info.discordId : (prev.discordId || null),
        webNotify: info.webNotify !== undefined ? info.webNotify : (prev.webNotify ?? false),
        sessionSecret: secret,
        firstLoginAt: info.firstLoginAt || prev.firstLoginAt || info.lastLoginAt,
        lastLoginAt: info.lastLoginAt
      };

      if (existingIdx >= 0) {
        // Cập nhật lại thông tin tài khoản đã có (đổi mk, đổi email, đổi tên...)
        // TUYỆT ĐỐI KHÔNG TẠO MỚI, KHÔNG BỊ TRÙNG LẶP THẺ!
        accounts[existingIdx] = updatedAcc;
        showModalMsg('Đã cập nhật thông tin tài khoản thành công!', 'success');
      } else {
        accounts.push(updatedAcc);
        showModalMsg('Thêm tài khoản thành công!', 'success');
      }

      saveAccounts();
      renderAccounts();

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
    // Đảm bảo không bao giờ có 2 tài khoản trùng UID trong danh sách
    const uniqueMap = new Map();
    for (const acc of accounts) {
      if (acc && acc.uid) {
        const sec = acc.sessionSecret || getSessionSecret(acc.uid);
        if (sec) {
          acc.sessionSecret = sec;
          saveSessionSecret(acc.uid, sec);
        }
        if (uniqueMap.has(acc.uid)) {
          uniqueMap.set(acc.uid, { ...uniqueMap.get(acc.uid), ...acc });
        } else {
          uniqueMap.set(acc.uid, acc);
        }
      }
    }
    accounts = Array.from(uniqueMap.values());
    if (accounts.length === 0) {
      localStorage.removeItem('locket_accounts');
      localStorage.removeItem('locket_session_secrets');
    } else {
      localStorage.setItem('locket_accounts', JSON.stringify(accounts));
    }
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
      const isUpdatedToday = Boolean(lastDate && lastDate >= todayYMD);

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

        // Nếu chuỗi đã đứt quá hạn (> 3 ngày, tức mất từ 3 ngày trở lên không thể khôi phục):
        // Hiển thị thẳng 0 ngày và lấy ngày hôm nay luôn, không hiện chuỗi cũ
        if (diffDays > 3 || !lastDate) {
          displayCount = 0;
          displayDate = formatDate(todayYMD);
        }
      }

      const isExpired = Boolean(acc.isSessionExpired);

      const actionRunBtn = isExpired
        ? `<button type="button" class="acc-btn acc-btn-relogin" onclick="window.openReloginModal('${acc.uid}', '${escapeHtml(acc.email || '')}')" title="Phiên làm việc đã hết hạn. Bấm để đăng nhập lại.">
            <svg class="acc-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            <span>Đăng nhập lại</span>
          </button>`
        : `<button type="button" id="btn-run-${acc.uid}" class="acc-btn acc-btn-run" onclick="runManual('${acc.uid}', this)">
            <svg class="acc-btn-icon acc-icon-lightning" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span>Chạy thủ công</span>
          </button>`;

      const expiredBadge = isExpired
        ? `<span class="session-badge-expired">⚠️ Hết phiên</span>`
        : '';

      const switchSub = isExpired
        ? `<span class="switch-sub switch-sub-error">⚠️ Phiên hết hạn - cần đăng nhập lại</span>`
        : `<span class="switch-sub">Tự động giữ chuỗi hàng ngày</span>`;

      return `
        <div class="account-card ${isExpired ? 'is-expired' : ''}" data-uid="${acc.uid}">
          <div class="acc-card-top">
            <div class="acc-profile-group">
              <div class="acc-avatar-wrap">
                ${avatarHtml}
              </div>
              <div class="acc-user-info">
                <div class="acc-name-row">
                  <h4 class="acc-name">${escapeHtml(acc.displayName || acc.email)}</h4>
                  ${acc.username ? `<span class="acc-username">@${escapeHtml(acc.username)}</span>` : ''}
                  ${expiredBadge}
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
                <input type="checkbox" ${acc.autoStreak && !isExpired ? 'checked' : ''} ${isExpired ? 'disabled' : ''} onclick="window.handleToggleAuto('${acc.uid}', this, event)">
                <span class="slider"></span>
              </label>
              <div class="switch-text-group">
                <span class="switch-title">Tự động giữ chuỗi</span>
                ${switchSub}
              </div>
            </div>

            <div class="acc-actions-row">
              ${isExpired ? '' : teleButton}
              ${actionRunBtn}
              <button type="button" class="acc-btn acc-btn-detail" onclick="window.openDetailModal('${acc.uid}')" title="Xem chi tiết thông số tài khoản">
                <svg class="acc-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span>Chi tiết</span>
              </button>
              <div class="acc-action-dropdown-wrap" id="menu-wrap-${acc.uid}">
                <button type="button" class="acc-btn acc-btn-options" id="btn-options-${acc.uid}" onclick="window.toggleOptionsMenu('${acc.uid}', event)" title="Tùy chọn tài khoản">
                  <svg class="acc-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></svg>
                  <span>Tùy chọn</span>
                  <svg class="acc-chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="acc-dropdown-menu" id="dropdown-${acc.uid}">
                  <button type="button" class="menu-item menu-item-logout" onclick="window.handleDeviceLogout('${acc.uid}')">
                    <svg class="menu-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    <div class="menu-item-text">
                      <span class="menu-item-title">Đăng xuất thiết bị</span>
                      <span class="menu-item-sub">Gỡ khỏi máy, bot vẫn chạy</span>
                    </div>
                  </button>
                  <div class="menu-divider"></div>
                  <button type="button" class="menu-item menu-item-danger" onclick="window.handleDeleteAccount('${acc.uid}')">
                    <svg class="menu-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    <div class="menu-item-text">
                      <span class="menu-item-title">Xóa khỏi hệ thống</span>
                      <span class="menu-item-sub">Xóa dữ liệu, hủy auto</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Toggle Auto (Gạt lạc quan ngay lập tức, nếu lỗi thì tự động gạt lại)
  window.handleToggleAuto = async function (uid, checkboxEl, event) {
    if (event) {
      event.stopPropagation();
    }

    const acc = accounts.find(a => a.uid === uid);
    if (!acc) return;

    if (acc.isSessionExpired) {
      checkboxEl.checked = false;
      alert(`Tài khoản "${acc.displayName || acc.email}" đã hết hạn phiên làm việc. Vui lòng bấm "Đăng nhập lại" trước.`);
      return;
    }

    // Trạng thái người dùng vừa gạt sang trên UI
    const desiredState = checkboxEl.checked;
    const previousState = !desiredState;

    try {
      const res = await fetch('/api/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, autoStreak: desiredState, sessionSecret: acc.sessionSecret })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.isSessionExpired) {
          acc.isSessionExpired = true;
          acc.autoStreak = false;
          saveAccounts();
          renderAccounts();
        }
        throw new Error(data.message || 'Lỗi khi cập nhật tự động giữ chuỗi.');
      }

      // API thành công: giữ nguyên vị trí đã gạt và lưu trạng thái
      acc.autoStreak = desiredState;
      saveAccounts();
    } catch (err) {
      // API lỗi: Tự động gạt trả về trạng thái cũ
      checkboxEl.checked = previousState;
      alert(`Không thể cập nhật: ${err.message}`);
    }
  };

  // Run Manual
  window.runManual = async function (uid, clickedBtn, isBatch = false) {
    const acc = accounts.find(a => a.uid === uid);
    if (!acc) return { success: false, message: 'Không tìm thấy tài khoản.' };

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
          if (!isBatch) {
            alert(data.message || 'Thao tác quá nhanh! Vui lòng đợi chút rồi thử lại.');
          }
          return { success: false, cooldown: true, remaining: data.remaining };
        }
        if (res.status === 401 || data.isSessionExpired || data.message?.includes('hết hạn') || data.message?.includes('đăng xuất')) {
          acc.isSessionExpired = true;
          acc.autoStreak = false;
          saveAccounts();
          renderAccounts();
          if (!isBatch) {
            alert(`Phiên đăng nhập của tài khoản "${acc.displayName || acc.email}" đã hết hạn. Vui lòng bấm "Đăng nhập lại" để cập nhật phiên mới.`);
          }
          return { success: false, isSessionExpired: true };
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

      return { success: true, streakCount: acc.streakCount };

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
      return { success: false, message: err.message };
    }
  };

  // Quản lý hiển thị trạng thái xử lý loading trên thẻ tài khoản
  function setCardProcessing(uid, isProcessing, text = 'Đang xử lý...') {
    const card = document.querySelector(`.account-card[data-uid="${uid}"]`);
    if (!card) return;

    const existingOverlay = card.querySelector('.card-processing-overlay');
    if (isProcessing) {
      card.classList.add('is-processing');
      if (!existingOverlay) {
        const overlay = document.createElement('div');
        overlay.className = 'card-processing-overlay';
        overlay.innerHTML = `
          <div class="card-spinner"></div>
          <span class="processing-text">${escapeHtml(text)}</span>
        `;
        card.appendChild(overlay);
      }
    } else {
      card.classList.remove('is-processing');
      if (existingOverlay) {
        existingOverlay.remove();
      }
    }
  }

  // Quản lý đóng/mở dropdown menu Tùy chọn
  window.toggleOptionsMenu = function (uid, event) {
    if (event) {
      event.stopPropagation();
    }
    const targetMenu = document.getElementById(`dropdown-${uid}`);
    const targetBtn = document.getElementById(`btn-options-${uid}`);
    const card = document.querySelector(`.account-card[data-uid="${uid}"]`);
    if (!targetMenu) return;

    const isShown = targetMenu.classList.contains('show');

    // Đóng tất cả menu khác và xóa class menu-open trên các thẻ
    document.querySelectorAll('.acc-dropdown-menu.show').forEach(el => {
      el.classList.remove('show');
      el.classList.remove('dropup');
      el.style.left = '';
      el.style.right = '';
    });
    document.querySelectorAll('.acc-btn-options.active').forEach(el => {
      el.classList.remove('active');
    });
    document.querySelectorAll('.account-card.menu-open').forEach(el => {
      el.classList.remove('menu-open');
    });

    if (!isShown) {
      targetMenu.style.left = '';
      targetMenu.style.right = '';

      // Tự động kiểm tra khoảng cách đáy màn hình: nếu quá sát đáy (< 190px) thì mở hướng lên trên (dropup)
      if (targetBtn) {
        const rect = targetBtn.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 190 && rect.top > 190) {
          targetMenu.classList.add('dropup');
        } else {
          targetMenu.classList.remove('dropup');
        }

        // Tự động kiểm tra mép màn hình: nếu căn phải mà mép trái bị tràn màn hình (< 12px) thì chuyển sang căn trái
        targetMenu.classList.add('show');
        const menuRect = targetMenu.getBoundingClientRect();
        if (menuRect.left < 12) {
          targetMenu.style.left = '0';
          targetMenu.style.right = 'auto';
        } else if (menuRect.right > window.innerWidth - 12) {
          targetMenu.style.right = '0';
          targetMenu.style.left = 'auto';
        }
      } else {
        targetMenu.classList.add('show');
      }

      if (targetBtn) targetBtn.classList.add('active');
      if (card) card.classList.add('menu-open');
    }
  };

  // Đóng dropdown khi click bất kỳ đâu bên ngoài
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.acc-action-dropdown-wrap')) {
      document.querySelectorAll('.acc-dropdown-menu.show').forEach(el => {
        el.classList.remove('show');
        el.classList.remove('dropup');
        el.style.left = '';
        el.style.right = '';
      });
      document.querySelectorAll('.acc-btn-options.active').forEach(el => {
        el.classList.remove('active');
      });
      document.querySelectorAll('.account-card.menu-open').forEach(el => {
        el.classList.remove('menu-open');
      });
    }
  });

  // 1. Đăng xuất thiết bị (Chỉ hủy phiên & dọn sạch cache trên thiết bị này, bot vẫn giữ chuỗi nếu đã bật)
  window.handleDeviceLogout = async function (uid) {
    const acc = accounts.find(a => a.uid === uid);
    if (!acc) return;

    // Đóng dropdown menu
    document.querySelectorAll('.acc-dropdown-menu.show').forEach(el => {
      el.classList.remove('show');
      el.classList.remove('dropup');
    });
    document.querySelectorAll('.acc-btn-options.active').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.account-card.menu-open').forEach(el => el.classList.remove('menu-open'));

    const accName = acc.displayName || acc.email;
    const confirmMsg = `Đăng xuất "${accName}" khỏi thiết bị này?\n(Bot vẫn giữ chuỗi)`;
    if (!confirm(confirmMsg)) return;

    // Bật hiệu ứng loading trên thẻ ngay lập tức để đợi API
    setCardProcessing(uid, true, 'Đang đăng xuất khỏi thiết bị...');

    try {
      const secret = acc.sessionSecret || getSessionSecret(uid);
      const res = await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, sessionSecret: secret })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Lỗi khi đăng xuất khỏi thiết bị.');
      }

      // API THÀNH CÔNG -> MỚI XÓA SẠCH TRONG CACHE & TRÊN GIAO DIỆN
      clearAccountCache(uid);
      accounts = accounts.filter(a => a.uid !== uid);
      saveAccounts();
      renderAccounts();

    } catch (err) {
      console.error('[Device Logout] Lỗi:', err.message);
      setCardProcessing(uid, false);
      alert(`Không thể đăng xuất: ${err.message}`);
    }
  };

  // 2. Xóa khỏi hệ thống (Xóa vĩnh viễn trên máy chủ Firestore và dừng việc giữ chuỗi)
  window.handleDeleteAccount = async function (uid) {
    const acc = accounts.find(a => a.uid === uid);
    if (!acc) return;

    // Đóng dropdown menu
    document.querySelectorAll('.acc-dropdown-menu.show').forEach(el => {
      el.classList.remove('show');
      el.classList.remove('dropup');
    });
    document.querySelectorAll('.acc-btn-options.active').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.account-card.menu-open').forEach(el => el.classList.remove('menu-open'));

    const accName = acc.displayName || acc.email;
    const confirmMsg = `Xóa vĩnh viễn "${accName}" khỏi hệ thống và hủy auto?`;
    if (!confirm(confirmMsg)) return;

    // Bật hiệu ứng loading trên thẻ ngay lập tức để đợi API
    setCardProcessing(uid, true, 'Đang xóa dữ liệu trên hệ thống...');

    try {
      const secret = acc.sessionSecret || getSessionSecret(uid);
      const res = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, sessionSecret: secret })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Lỗi khi xóa dữ liệu tài khoản khỏi hệ thống.');
      }

      // API THÀNH CÔNG -> MỚI XÓA SẠCH TRONG CACHE & TRÊN GIAO DIỆN
      clearAccountCache(uid);
      accounts = accounts.filter(a => a.uid !== uid);
      saveAccounts();
      renderAccounts();

    } catch (err) {
      console.error('[Delete Account] Lỗi:', err.message);
      setCardProcessing(uid, false);
      alert(`Không thể xóa tài khoản: ${err.message}`);
    }
  };

  // Backward-compatibility alias
  window.deleteAccount = window.handleDeviceLogout;

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
  async function syncAllAccountsFromLocket(silent = false, skipRender = false) {
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
        if (resData.botUsername) {
          telegramBotUsername = resData.botUsername;
          telegramBotUsernameLoaded = true;
        }
        if (resData.vapidPublicKey) {
          cachedVapidPublicKey = resData.vapidPublicKey;
          localStorage.setItem('locket_vapid_public_key', resData.vapidPublicKey);
        }
        let hasChanges = false;
        resData.data.forEach(freshAcc => {
          const idx = accounts.findIndex(a => a.uid === freshAcc.uid);
          if (idx >= 0) {
            const secret = accounts[idx].sessionSecret || getSessionSecret(freshAcc.uid);
            accounts[idx] = { ...accounts[idx], ...freshAcc, sessionSecret: secret };
            hasChanges = true;
          }
        });

        if (hasChanges) {
          saveAccounts();
          if (!skipRender) {
            renderAccounts();
          }
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
        if (!skipRender) {
          renderAccounts();
        }
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

  // Run All (Chỉ quét các tài khoản CHƯA có chuỗi hôm nay & còn phiên hợp lệ)
  btnRunAll?.addEventListener('click', async () => {
    if (accounts.length === 0) return alert('Chưa có tài khoản nào.');
    if (btnRunAll.disabled) return;

    const validAccounts = accounts.filter(a => !a.isSessionExpired);
    if (validAccounts.length === 0) {
      return alert('Tất cả tài khoản đều đã hết hạn phiên làm việc. Vui lòng bấm "Đăng nhập lại" để tiếp tục.');
    }

    // Tự động bỏ qua các tài khoản đã duy trì chuỗi hôm nay
    const pendingAccounts = validAccounts.filter(a => !a.isMaintainedToday);
    if (pendingAccounts.length === 0) {
      return alert('Tuyệt vời! Tất cả tài khoản hợp lệ đều đã hoàn thành chuỗi hôm nay rồi 🎉');
    }

    btnRunAll.disabled = true;
    const runLabel = document.getElementById('btn-run-all-label');
    const originalLabel = runLabel ? runLabel.textContent : 'Chạy tất cả';

    let successCount = 0;
    let cooldownSkipped = 0;

    try {
      for (let i = 0; i < pendingAccounts.length; i++) {
        const acc = pendingAccounts[i];
        if (runLabel) runLabel.textContent = `Đang chạy (${i + 1}/${pendingAccounts.length})...`;
        const res = await window.runManual(acc.uid, null, true);

        if (res && res.success) {
          successCount++;
        } else if (res && res.cooldown) {
          cooldownSkipped++;
        }

        // Nghỉ ngẫu nhiên 0.8s - 1.5s giữa các tài khoản để Locket xử lý an toàn
        if (i < pendingAccounts.length - 1) {
          const jitter = Math.floor(Math.random() * 700) + 800;
          await new Promise(r => setTimeout(r, jitter));
        }
      }

      let finishLabel = `Đã hoàn tất (${successCount}/${pendingAccounts.length})!`;
      if (cooldownSkipped > 0) {
        finishLabel = `Xong: ${successCount} nick (${cooldownSkipped} nick đang chờ cooldown)`;
      }
      if (runLabel) runLabel.textContent = finishLabel;

      setTimeout(() => {
        if (runLabel) runLabel.textContent = originalLabel;
        btnRunAll.disabled = false;
      }, 2200);
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
  let telegramBotUsername = '';
  let cachedVapidPublicKey = localStorage.getItem('locket_vapid_public_key') || null;
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
    if (!currentTeleCode) {
      currentTeleCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    if (btnOpenTelegramBot) {
      if (telegramBotUsername) {
        btnOpenTelegramBot.href = `https://t.me/${telegramBotUsername}?start=${acc.uid}_${currentTeleCode}`;
      } else {
        btnOpenTelegramBot.href = '#';
      }
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


  // Helper chuyển đổi VAPID public key cho PushManager
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Kiểm tra trạng thái Web Push trên thiết bị hiện tại (đồng bộ tức thì 0ms như Tele và Discord)
  function isWebPushActive(uid) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return false;
    }
    return localStorage.getItem('locket_webpush_' + uid) === 'true';
  }

  // Tự động đăng ký Service Worker cho Web Push PWA (không gọi API nào khi load trang)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('[SW] Không thể đăng ký sw.js:', err.message);
    });
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

    // Web Notification state: Hiển thị ngay lập tức 0ms đồng bộ cùng Tele & Discord
    toggleNotifyWeb.checked = isWebPushActive(acc.uid);

    // Telegram state (luôn hiển thị phần kết nối với mã xác thực 5 phút)
    if (btnCheckTelegramLink) {
      btnCheckTelegramLink.classList.remove('btn-action-error', 'btn-action-success');
      btnCheckTelegramLink.disabled = false;
    }
    if (teleCheckIcon) teleCheckIcon.innerHTML = '';
    if (teleCheckLabel) teleCheckLabel.textContent = 'Kiểm tra kết nối';

    currentTeleCode = null;
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
  setupSafeBackdropDismiss(modalNotify, closeNotifyModal);

  // Toggle Web Notifications: Quản lý đăng ký Web Push riêng biệt cho từng thiết bị và tài khoản
  toggleNotifyWeb?.addEventListener('change', async () => {
    const acc = accounts.find(a => a.uid === activeNotifyUid);
    if (!acc) return;

    const desiredState = toggleNotifyWeb.checked;

    if (desiredState) {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        toggleNotifyWeb.checked = false;
        alert('Trình duyệt trên thiết bị này không hỗ trợ Web Push Notification. (Nếu là iPhone, vui lòng dùng tính năng "Thêm vào màn hình chính" để kích hoạt).');
        return;
      }

      try {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          toggleNotifyWeb.checked = false;
          alert('Bạn chưa cấp quyền thông báo trên trình duyệt của thiết bị này.');
          return;
        }

        let key = cachedVapidPublicKey;
        if (!key) {
          const keyRes = await fetch('/api/push');
          const keyData = await keyRes.json();
          if (keyData.success && keyData.publicKey) {
            key = keyData.publicKey;
            cachedVapidPublicKey = key;
            localStorage.setItem('locket_vapid_public_key', key);
          }
        }
        if (!key) {
          throw new Error('Chưa thể lấy thông tin cấu hình VAPID từ server.');
        }

        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(key)
          });
        }

        // Đăng ký thiết bị này cho đúng UID tài khoản
        const subRes = await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'subscribe',
            uid: acc.uid,
            subscription: sub.toJSON()
          })
        });

        const subJson = await subRes.json();
        if (!subRes.ok || !subJson.success) {
          throw new Error(subJson.message || 'Lỗi khi đăng ký nhận thông báo.');
        }

        localStorage.setItem('locket_webpush_' + acc.uid, 'true');
        toggleNotifyWeb.checked = true;
      } catch (err) {
        localStorage.removeItem('locket_webpush_' + acc.uid);
        toggleNotifyWeb.checked = false;
        alert(err.message || 'Lỗi khi kích hoạt thông báo trên trình duyệt.');
      }
    } else {
      // Hủy đăng ký trên thiết bị này cho UID này
      localStorage.removeItem('locket_webpush_' + acc.uid);
      toggleNotifyWeb.checked = false;
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await fetch('/api/push', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'unsubscribe',
                uid: acc.uid,
                endpoint: sub.endpoint
              })
            });
          }
        }
      } catch (_) {}
    }
  });

  // Toggle Telegram: Cho phép gạt lạc quan khi tắt, nếu chưa liên kết thì nhắc mở bot
  toggleNotifyTele?.addEventListener('change', async () => {
    const acc = accounts.find(a => a.uid === activeNotifyUid);
    if (!acc) return;

    // Nếu chưa liên kết mà bấm gạt BẬT -> gạt lại về false và hướng dẫn liên kết
    if (!acc.telegramId) {
      toggleNotifyTele.checked = false;
      alert('Vui lòng bấm nút "Mở Telegram Bot" bên dưới để hoàn tất liên kết tài khoản.');
      return;
    }

    const desiredState = toggleNotifyTele.checked;
    if (!desiredState) {
      cancelTeleAutoTimer();
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

        acc.telegramId = null;
        saveAccounts();
        renderAccounts();

        teleLinkedView.style.display = 'none';
        teleUnlinkedView.style.display = 'block';
        refreshTeleCode(acc);
      } catch (err) {
        // Tự động gạt trả về trạng thái bật nếu lỗi
        toggleNotifyTele.checked = true;
        alert(err.message || 'Lỗi huỷ liên kết Telegram.');
      }
    } else {
      toggleNotifyTele.checked = true;
    }
  });

  // Khi bấm "Mở Telegram Bot": đảm bảo có botUsername rồi mới mở, và hẹn giờ 5 giây sau tự check 1 lần
  btnOpenTelegramBot?.addEventListener('click', async (e) => {
    cancelTeleAutoTimer();
    const acc = accounts.find(a => a.uid === activeNotifyUid);
    if (!acc) return;

    if (!telegramBotUsernameLoaded || !telegramBotUsername) {
      e.preventDefault();
      await ensureTelegramBotInfo();
      refreshTeleCode(acc);
      if (telegramBotUsername) {
        window.open(btnOpenTelegramBot.href, '_blank');
      } else {
        alert('Chưa cấu hình TELEGRAM_BOT_USERNAME trong biến môi trường hệ thống.');
        return;
      }
    }

    teleAutoCheckTimer = setTimeout(async () => {
      teleAutoCheckTimer = null;
      const currentAcc = accounts.find(a => a.uid === activeNotifyUid);
      // Chỉ tự check đúng 1 lần nếu modal vẫn mở và chưa liên kết
      if (currentAcc && !currentAcc.telegramId && modalNotify.style.display !== 'none') {
        await checkTelegramStatus(true);
      }
    }, 5000);
  });

  // Kiểm tra kết nối Telegram (gọi 1 lần sau 5s hoặc khi người dùng chủ động bấm)
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

      if (data.botUsername) {
        telegramBotUsername = data.botUsername;
        telegramBotUsernameLoaded = true;
      }

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

  // Toggle Discord: Cho phép gạt lạc quan khi tắt, nếu chưa liên kết thì nhắc dán webhook
  toggleNotifyDiscord?.addEventListener('change', async () => {
    const acc = accounts.find(a => a.uid === activeNotifyUid);
    if (!acc) return;

    // Nếu chưa có Discord Webhook mà bấm gạt BẬT -> gạt lại về false và nhắc nhập
    if (!acc.discordId) {
      toggleNotifyDiscord.checked = false;
      discordWebhookUrl?.focus();
      alert('Vui lòng dán Discord Webhook URL bên dưới và bấm "Kiểm tra & Lưu" để kích hoạt.');
      return;
    }

    const desiredState = toggleNotifyDiscord.checked;
    if (!desiredState) {
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

        acc.discordId = null;
        discordWebhookUrl.value = '';
        saveAccounts();
        renderAccounts();

        discordLinkedView.style.display = 'none';
        discordUnlinkedView.style.display = 'block';
      } catch (err) {
        // Tự động gạt trả về trạng thái bật nếu lỗi
        toggleNotifyDiscord.checked = true;
        alert(err.message || 'Lỗi khi huỷ liên kết Discord.');
      }
    } else {
      toggleNotifyDiscord.checked = true;
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
    let lastMenuTap = 0;
    mobileMenuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleMobileMenu();
    });
    mobileMenuBtn.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastMenuTap < 350) {
        e.preventDefault();
      }
      lastMenuTap = now;
    }, { passive: false });
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

  // Chặn triệt để cử chỉ Double-Tap để Zoom và Pinch-to-Zoom trên điện thoại
  let lastTouchEndTime = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEndTime <= 300) {
      if (!['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
        e.preventDefault();
      }
    }
    lastTouchEndTime = now;
  }, { passive: false });

  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
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
  setupSafeBackdropDismiss(modalDetail, closeDetailModal);

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

    const isUpdatedToday = Boolean(streak.isMaintainedToday || (lastDate && lastDate >= todayYMD));

    let streakStatusBadge = '';
    let distanceText = 'Chưa rõ';

    const isExpired = Boolean(acc.isSessionExpired || streak.isSessionExpired || stats.lastStreakStatus === 'token_expired');

    if (isExpired) {
      streakStatusBadge = '<span class="detail-badge badge-danger">Phiên đã hết hạn</span>';
      distanceText = 'Hết hạn (Cần đăng nhập lại)';
    } else if (diffDays === 0 || isUpdatedToday) {
      streakStatusBadge = '<span class="detail-badge badge-success">Đã duy trì hôm nay</span>';
      distanceText = 'Hôm nay (Đã duy trì)';
    } else if (diffDays === 1) {
      // Hôm qua đã duy trì, hôm nay chưa nâng chuỗi
      streakStatusBadge = '<span class="detail-badge badge-warning">Chưa duy trì hôm nay</span>';
      distanceText = 'Hôm qua (Chưa duy trì)';
    } else if (diffDays === 2) {
      // Đã miss 1 ngày (hôm qua)
      streakStatusBadge = '<span class="detail-badge badge-warning">Đã mất 1 ngày</span>';
      distanceText = 'Trễ 1 ngày (Có thể khôi phục)';
    } else if (diffDays === 3) {
      // Đã miss 2 ngày (hôm kia & hôm qua)
      streakStatusBadge = '<span class="detail-badge badge-warning">Đã mất 2 ngày</span>';
      distanceText = 'Trễ 2 ngày (Có thể khôi phục)';
    } else if (diffDays >= 4 && diffDays < 999) {
      // Đã miss từ 3 ngày trở lên (vượt quá khả năng khôi phục của Locket)
      const lostDays = diffDays - 1;
      streakStatusBadge = `<span class="detail-badge badge-danger">Đã mất ${lostDays} ngày</span>`;
      distanceText = `Trễ ${lostDays} ngày (Không thể khôi phục)`;
    } else {
      streakStatusBadge = '<span class="detail-badge badge-neutral">Chưa có chuỗi</span>';
      distanceText = 'Chưa rõ';
    }

    let lastRunBadge = '<span class="detail-badge badge-neutral">Chưa có lượt chạy</span>';
    if (isExpired) {
      lastRunBadge = '<span class="detail-badge badge-danger">Hết hạn token</span>';
    } else if (stats.lastStreakStatus === 'success') {
      lastRunBadge = '<span class="detail-badge badge-success">Thành công</span>';
    } else if (stats.lastStreakStatus === 'already_updated' || stats.lastStreakStatus === 'skipped') {
      lastRunBadge = '<span class="detail-badge badge-success">Đã có chuỗi</span>';
    } else if (stats.lastStreakStatus === 'error') {
      lastRunBadge = '<span class="detail-badge badge-danger">Thất bại</span>';
    } else if (isUpdatedToday || stats.isMaintainedToday || (lastDate && lastDate >= todayYMD)) {
      lastRunBadge = '<span class="detail-badge badge-success">Đã có chuỗi</span>';
    } else if (stats.lastStreakRunAt || acc.lastStreakRunAt) {
      lastRunBadge = '<span class="detail-badge badge-success">Đã có chuỗi</span>';
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
              <span class="detail-val">${distanceText}</span>
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
              <span class="detail-label">Web Push (Thiết bị này)</span>
              <span class="detail-val">
                ${isWebPushActive(uid) 
                  ? '<span class="detail-badge badge-success">Đã bật</span>' 
                  : '<span class="detail-badge badge-neutral">Đang tắt</span>'}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Hiển thị hiệu ứng skeleton loading mượt mà trên dashboard: Đợi API đồng bộ hoàn tất mới render 1 lần duy nhất
  if (accounts.length > 0) {
    renderSkeleton(accounts.length);
    barAccountCount.textContent = `${accounts.length} tài khoản`;
    try {
      // Đợi API đồng bộ xong dữ liệu chuỗi mới nhất
      await syncAllAccountsFromLocket(true, true);
    } catch (err) {
      console.warn('[Dashboard Init] Lỗi đồng bộ khởi động:', err.message);
    } finally {
      // Render tài khoản 1 lần duy nhất với dữ liệu hoàn chỉnh, không bị giật nháy
      renderAccounts();
    }
  } else {
    renderAccounts();
  }

  // Tự động điều chỉnh vị trí Modal theo bàn phím ảo mobile (ở giữa khi đóng, nâng lên khi mở)
  if (window.visualViewport) {
    const syncModalViewport = () => {
      const activeOverlay = Array.from(document.querySelectorAll('.modal-overlay'))
        .find(el => el.style.display && el.style.display !== 'none');
      if (!activeOverlay) return;

      const vv = window.visualViewport;
      const isKeyboardOpen = vv.height < window.innerHeight * 0.82;
      const card = activeOverlay.querySelector('.modal-card');

      if (isKeyboardOpen) {
        activeOverlay.style.height = `${vv.height}px`;
        activeOverlay.style.top = `${vv.offsetTop}px`;
        if (card) card.style.transform = 'translateY(0)';
      } else {
        activeOverlay.style.height = '';
        activeOverlay.style.top = '';
        if (card) card.style.transform = '';
      }
    };

    window.visualViewport.addEventListener('resize', syncModalViewport);
    window.visualViewport.addEventListener('scroll', syncModalViewport);
  }
});
