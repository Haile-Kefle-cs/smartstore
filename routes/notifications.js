// Notifications JavaScript
async function loadNotifications() {
    showLoading();
    
    try {
        const result = await SmartStore.apiRequest('/notifications');
        renderNotifications(result.data);
    } catch (error) {
        showError(error.message);
    }
}

function renderNotifications(notifications) {
    const unreadCount = notifications.filter(n => !n.read).length;
    
    contentArea.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h2>Notifications</h2>
                <div class="header-actions">
                    <span class="badge">${unreadCount} unread</span>
                    <button class="btn btn-secondary" onclick="markAllNotificationsRead()">
                        Mark All as Read
                    </button>
                </div>
            </div>

            <div class="notifications-list">
                ${notifications.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-state-icon">🔔</div>
                        <div class="empty-state-title">No Notifications</div>
                        <div class="empty-state-message">You're all caught up!</div>
                    </div>
                ` : notifications.map(notification => `
                    <div class="notification-item ${notification.read ? 'read' : 'unread'}" 
                         onclick="markNotificationRead('${notification.id}')">
                        <div class="notification-icon">
                            ${getNotificationIcon(notification.type)}
                        </div>
                        <div class="notification-content">
                            <div class="notification-title">${notification.title}</div>
                            <div class="notification-message">${notification.message}</div>
                            <div class="notification-time">${SmartStore.formatDateTime(notification.createdAt)}</div>
                        </div>
                        ${!notification.read ? '<span class="unread-dot"></span>' : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function getNotificationIcon(type) {
    const icons = {
        'low_stock': '⚠️',
        'sale': '💰',
        'purchase': '📥',
        'return': '↩️',
        'refund': '💳',
        'reorder': '📦',
        'system': '🔔'
    };
    return icons[type] || '📢';
}

async function markNotificationRead(notificationId) {
    try {
        await SmartStore.apiRequest(`/notifications/${notificationId}/read`, 'PATCH');
        loadNotifications();
        checkNotifications(); // Update badge count
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllNotificationsRead() {
    try {
        await SmartStore.apiRequest('/notifications/read-all', 'PATCH');
        SmartStore.showToast('All notifications marked as read');
        loadNotifications();
        checkNotifications();
    } catch (error) {
        SmartStore.showToast(error.message, 'error');
    }
}