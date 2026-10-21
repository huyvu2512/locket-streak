import webpush from 'web-push';
import crypto from 'crypto';
import { db } from './db.js';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (err) {
    console.warn('[Push] Lỗi cấu hình VAPID:', err.message);
  }
}

function getEndpointHash(endpoint) {
  return crypto.createHash('sha256').update(endpoint || '').digest('hex').slice(0, 32);
}

/**
 * API Quản lý Web Push Subscriptions
 * GET  /api/push -> Trả về VAPID Public Key
 * POST /api/push -> Đăng ký (subscribe), Hủy (unsubscribe), hoặc Kiểm tra (check)
 */
export default async function pushHandler(req, res) {
  // 1. GET: Lấy Public Key để client tạo PushSubscription
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      publicKey: VAPID_PUBLIC_KEY
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { action, uid, subscription, endpoint } = req.body || {};
  const cleanUid = typeof uid === 'string' ? uid.trim() : '';

  if (!cleanUid || !/^[a-zA-Z0-9_-]{10,64}$/.test(cleanUid)) {
    return res.status(400).json({ success: false, message: 'Mã UID không hợp lệ.' });
  }

  if (!db) {
    return res.status(503).json({ success: false, message: 'Dịch vụ cơ sở dữ liệu tạm thời gián đoạn.' });
  }

  try {
    const userDoc = await db.collection('users').doc(cleanUid).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Tài khoản không tồn tại trong hệ thống.'
      });
    }

    // 2. Action: ĐĂNG KÝ (Subscribe) thiết bị này cho đúng UID
    if (action === 'subscribe') {
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ success: false, message: 'Dữ liệu PushSubscription không hợp lệ.' });
      }

      const endpointHash = getEndpointHash(subscription.endpoint);
      const subRef = db.collection('users').doc(cleanUid).collection('subscriptions').doc(endpointHash);

      await subRef.set({
        uid: cleanUid,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: req.headers['user-agent'] || '',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Gửi 1 thông báo chào mừng tức thì để người dùng xác nhận thiết bị đã nhận được
      if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
        try {
          await webpush.sendNotification(subscription, JSON.stringify({
            title: 'Locket Streak',
            body: '🔔 Đã kích hoạt thông báo thành công trên thiết bị này!',
            icon: '/assets/icon-192.png',
            badge: '/assets/icon-192.png',
            data: { url: '/dashboard' }
          }));
        } catch (pushErr) {
          console.warn('[Push] Không thể gửi thông báo chào mừng:', pushErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Đăng ký thông báo trên thiết bị này thành công!'
      });
    }

    // 3. Action: HỦY ĐĂNG KÝ (Unsubscribe)
    if (action === 'unsubscribe') {
      const targetEndpoint = endpoint || subscription?.endpoint;
      if (targetEndpoint) {
        const endpointHash = getEndpointHash(targetEndpoint);
        await db.collection('users').doc(cleanUid).collection('subscriptions').doc(endpointHash).delete();
      }
      return res.status(200).json({
        success: true,
        message: 'Đã hủy nhận thông báo trên thiết bị này.'
      });
    }

    // 4. Action: KIỂM TRA (Check trạng thái đăng ký của thiết bị hiện tại)
    if (action === 'check') {
      const targetEndpoint = endpoint || subscription?.endpoint;
      if (!targetEndpoint) {
        return res.status(200).json({ success: true, subscribed: false });
      }
      const endpointHash = getEndpointHash(targetEndpoint);
      const doc = await db.collection('users').doc(cleanUid).collection('subscriptions').doc(endpointHash).get();
      return res.status(200).json({
        success: true,
        subscribed: doc.exists
      });
    }

    return res.status(400).json({ success: false, message: 'Hành động không hợp lệ.' });

  } catch (error) {
    console.error('[API Push] Lỗi xử lý:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi xử lý thông báo Web Push.'
    });
  }
}
