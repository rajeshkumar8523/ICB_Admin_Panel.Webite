const sidebar = document.getElementById('sidebar');
const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');

// Sidebar toggle functionality
function toggleSidebar() {
    sidebar.classList.toggle('expanded');
    toggleSidebarBtn.textContent = sidebar.classList.contains('expanded') ? '←' : '→';
    if (!sidebar.classList.contains('expanded')) {
        document.querySelectorAll('.submenu').forEach(submenu => submenu.classList.remove('active'));
    }
}

toggleSidebarBtn.addEventListener('click', toggleSidebar);

function toggleDropdown(submenuId, iconId) {
    if (!sidebar.classList.contains('expanded')) return;
    var submenu = document.getElementById(submenuId);
    var icon = document.getElementById(iconId);
    submenu.classList.toggle("active");
    icon.classList.toggle("rotated");
}

// Initialize the map
const map = L.map('map').setView([16.6989, 77.9405], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Store markers to update them later
const markers = {};

// Initialize Socket.IO
const socket = io('http://localhost:5005', { // Update this URL based on environment
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

// Fetch initial bus data
async function fetchInitialBusData() {
    try {
        const response = await fetch('http://localhost:5005/api/tracking');
        const buses = await response.json();
        updateMap(buses);
    } catch (error) {
        console.error('Error fetching initial bus data:', error);
    }
}

// Update map with bus data
function updateMap(buses) {
    buses.forEach(bus => {
        const coords = [bus.latitude, bus.longitude];
        
        if (markers[bus.busNumber]) {
            // Update existing marker
            markers[bus.busNumber].setLatLng(coords);
            markers[bus.busNumber].setPopupContent(
                `Bus No ${bus.busNumber}<br>
                Driver: ${bus.driverName}<br>
                Route: ${bus.route}<br>
                Speed: ${bus.speed} km/h<br>
                Capacity: ${bus.capacity}<br>
                Students: ${bus.currentStudents}<br>
                Last Updated: ${new Date(bus.lastUpdated).toLocaleTimeString()}`
            );
        } else {
            // Create new marker
            markers[bus.busNumber] = L.marker(coords).addTo(map)
                .bindPopup(
                    `Bus No ${bus.busNumber}<br>
                    Driver: ${bus.driverName}<br>
                    Route: ${bus.route}<br>
                    Speed: ${bus.speed} km/h<br>
                    Capacity: ${bus.capacity}<br>
                    Students: ${bus.currentStudents}<br>
                    Last Updated: ${new Date(bus.lastUpdated).toLocaleTimeString()}`
                );
        }
    });
}

// Socket.IO real-time updates
socket.on('busUpdate', (busData) => {
    updateMap([busData]);
});

// Initial load
fetchInitialBusData();

// For Vercel environment, update socket connection
if (window.location.hostname !== 'localhost') {
    socket.io.uri = 'https://icb-admin-panel-website-8tjak5gmq-rajeshkumar8523s-projects.vercel.app';
    socket.connect();
}
