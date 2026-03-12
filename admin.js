import { app } from './firebase-config.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

// UI Elements
const loginSection = document.getElementById('login-section');
const updateSection = document.getElementById('update-section');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const updateBtn = document.getElementById('update-btn');
const locationSelect = document.getElementById('location-select');
const locationOther = document.getElementById('location-other');
const messageInput = document.getElementById('message-input');
const colorSelect = document.getElementById('color-select');
const feedbackMsg = document.getElementById('feedback-msg');

// Live Preview Elements
const locationDisplay = document.getElementById('location-display');
const statusMessage = document.getElementById('status-message');
const statusDot = document.getElementById('status-dot');

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is logged in
        loginSection.classList.add('hidden');
        updateSection.classList.remove('hidden');
        fetchCurrentStatus();
    } else {
        // User is logged out
        loginSection.classList.remove('hidden');
        updateSection.classList.add('hidden');
    }
});

// Login
loginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch((error) => {
        console.error("Login failed", error);
        alert("Login failed: " + error.message);
    });
});

// Logout
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// Fetch current status to populate inputs and preview
async function fetchCurrentStatus() {
    const statusRef = ref(db, 'status');
    // Use onValue instead of get to keep the preview live
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        module.onValue(statusRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                // Update Live Preview
                locationDisplay.textContent = data.location || "Unknown Location";
                statusMessage.textContent = data.message || "No status right now.";
                statusDot.className = 'status-dot ' + (data.color || 'grey');

                // Update Inputs (only if not currently focused to avoid overwriting typing)
                if (document.activeElement !== locationOther && document.activeElement !== messageInput) {
                    let locationFound = false;
                    for (let i = 0; i < locationSelect.options.length; i++) {
                        if (locationSelect.options[i].value === data.location) {
                            locationFound = true;
                            break;
                        }
                    }
                    
                    if (locationFound) {
                        locationSelect.value = data.location;
                        locationOther.classList.add('hidden');
                    } else if (data.location) {
                        locationSelect.value = "Other";
                        locationOther.value = data.location;
                        locationOther.classList.remove('hidden');
                    }

                    messageInput.value = data.message || '';
                    if (data.color) {
                        colorSelect.value = data.color;
                    }
                }
            } else {
                locationDisplay.textContent = "Not Set";
                statusMessage.textContent = "Awaiting the first update.";
                statusDot.className = 'status-dot grey';
            }
        });
    });
}

// Auto-populate message based on color
colorSelect.addEventListener('change', () => {
    switch(colorSelect.value) {
        case 'green':
            messageInput.value = "Available";
            break;
        case 'red':
            messageInput.value = "Please send an email and I will look at it as soon as I can.";
            break;
        case 'yellow':
            messageInput.value = "Out of office / Away from desk. Please email me.";
            break;
        case 'grey':
            messageInput.value = "";
            break;
    }
});

// Toggle "Other" location input
locationSelect.addEventListener('change', () => {
    if (locationSelect.value === 'Other') {
        locationOther.classList.remove('hidden');
        locationOther.focus();
    } else {
        locationOther.classList.add('hidden');
    }
});

// Update Status
updateBtn.addEventListener('click', async () => {
    let location = locationSelect.value.trim();
    if (location === 'Other') {
        location = locationOther.value.trim();
    }
    
    const message = messageInput.value.trim();
    const color = colorSelect.value;

    if (!location) {
        feedbackMsg.style.color = "#ff5252";
        feedbackMsg.textContent = "Location is required!";
        return;
    }

    updateBtn.disabled = true;
    updateBtn.textContent = "Updating...";

    try {
        await set(ref(db, 'status'), {
            location: location,
            message: message,
            color: color,
            updatedAt: new Date().toISOString()
        });
        
        feedbackMsg.style.color = "#69f0ae";
        feedbackMsg.textContent = "Location updated successfully!";
        
        setTimeout(() => {
            feedbackMsg.textContent = "";
        }, 3000);
    } catch (error) {
        console.error("Update failed", error);
        feedbackMsg.style.color = "#ff5252";
        feedbackMsg.textContent = "Failed to update: " + error.message;
    } finally {
        updateBtn.disabled = false;
        updateBtn.textContent = "Update Location";
    }
});
