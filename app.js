import { app } from './firebase-config.js';
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Initialize Realtime Database
const db = getDatabase(app);
const statusRef = ref(db, 'status');

const locationDisplay = document.getElementById('location-display');
const statusMessage = document.getElementById('status-message');
const timestampDisplay = document.getElementById('timestamp');
const loader = document.getElementById('loading');
const content = document.getElementById('content');
const statusDot = document.getElementById('status-dot');

// Listen for real-time updates
onValue(statusRef, (snapshot) => {
    const data = snapshot.val();
    
    if (data) {
        locationDisplay.textContent = data.location || "Unknown Location";
        statusMessage.textContent = data.message || "No status right now.";
        
        // Update status dot color
        statusDot.className = 'status-dot ' + (data.color || 'grey');
        
        if (data.updatedAt) {
            const date = new Date(data.updatedAt);
            timestampDisplay.textContent = `Last updated: ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
    } else {
        locationDisplay.textContent = "Not Set";
        statusMessage.textContent = "Awaiting the first update.";
        statusDot.className = 'status-dot grey';
    }

    // Hide loader and show content
    loader.classList.add('hidden');
    content.classList.remove('hidden');
}, (error) => {
    console.error("Error fetching data:", error);
    locationDisplay.textContent = "Error";
    statusMessage.textContent = "Could not connect to database.";
    loader.classList.add('hidden');
    content.classList.remove('hidden');
});
