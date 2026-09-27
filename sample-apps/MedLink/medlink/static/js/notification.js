// ============================================
// MedLink Live Notifications
// ============================================

let lastNotificationId = 0;
let firstLoad = true;

const badge = document.getElementById("notification-count");
const list = document.getElementById("notification-list");

function fetchNotifications() {

    fetch("/notifications/")

    .then(response => response.json())

    .then(notifications => {

        updateBadge(notifications);

        updateDropdown(notifications);

        checkForNewNotification(notifications);

    })

    .catch(error => {

        console.log("Notification Error:", error);

    });

}
// ============================================
// Notification Badge
// ============================================

function updateBadge(notifications) {

    if (!badge) return;

    const unread = notifications.filter(n => !n.is_read).length;

    if (unread > 0) {

        badge.style.display = "flex";

        badge.innerText = unread;

    }

    else {

        badge.style.display = "none";

    }

}

// ============================================
// Notification Dropdown
// ============================================

function updateDropdown(notifications) {

    if (!list) return;

    list.innerHTML = `

        <li class="dropdown-header fw-bold">

            Notifications

        </li>

        <li>

            <hr class="dropdown-divider">

        </li>

    `;

    if (notifications.length === 0) {

        list.innerHTML += `

            <li class="text-center text-muted py-4">

                No notifications

            </li>

        `;

        return;

    }

    notifications.forEach(notification => {

        list.innerHTML += `

        <li>

            <a
                href="#"
                class="dropdown-item py-3">

                <div class="fw-bold mb-1">

                    ${notification.title}

                </div>

                <div class="small text-dark">

                    ${notification.message}

                </div>

                <small class="text-muted">

                    🕒 ${notification.time}

                </small>

            </a>

        </li>

        <li>

            <hr class="dropdown-divider m-0">

        </li>

        `;

    });

}
// ============================================
// Detect New Notifications
// ============================================

function checkForNewNotification(notifications) {

    if (notifications.length === 0) return;

    const newestId = notifications[0].id;

    // First load
    if (firstLoad) {

        lastNotificationId = newestId;

        firstLoad = false;

        return;

    }

    // New notification arrived
    if (newestId > lastNotificationId) {

        lastNotificationId = newestId;

        animateBell();

        playNotificationSound();

        showToast(notifications[0]);

    }

}

// ============================================
// Toast Notification
// ============================================

function showToast(notification) {

    const oldToast = document.querySelector(".notification-toast");

    if (oldToast) {

        oldToast.remove();

    }

    const toast = document.createElement("div");

    toast.className = "notification-toast";

    toast.innerHTML = `

        <div class="toast-title">

            🔔 ${notification.title}

        </div>

        <div class="toast-message">

            ${notification.message}

        </div>

    `;

    document.body.appendChild(toast);

    setTimeout(() => {

        toast.classList.add("show");

    },100);

    setTimeout(() => {

        toast.classList.remove("show");

        setTimeout(() => {

            toast.remove();

        },300);

    },5000);

}
// ============================================
// Bell Animation
// ============================================

function animateBell() {

    const bell = document.querySelector(".fa-bell");

    if (!bell) return;

    bell.classList.add("bell-shake");

    setTimeout(() => {

        bell.classList.remove("bell-shake");

    }, 800);

}

// ============================================
// Notification Sound
// ============================================

function playNotificationSound() {

    const audio = new Audio("/static/sounds/notification.mp3");

    audio.volume = 0.35;

    audio.play().catch(() => {});

}

// ============================================
// Start Notifications
// ============================================

document.addEventListener("DOMContentLoaded", () => {

    fetchNotifications();

    setInterval(fetchNotifications, 2000);

});