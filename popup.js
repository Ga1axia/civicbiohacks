// Initialize the map
let map = L.map('map').setView([51.505, -0.09], 2);  // Default view (latitude: 51.505, longitude: -0.09)

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Function to search for a location and move the map
function searchLocation() {
    let searchTerm = document.getElementById('search-bar').value;

    if (searchTerm) {
        // Use the OpenCage Geocoding API to get latitude and longitude
        const apiKey = 'YOUR_OPENCAGE_API_KEY';  // Replace with your OpenCage API Key
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${searchTerm}&key=${apiKey}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.results && data.results.length > 0) {
                    let location = data.results[0].geometry;
                    map.setView([location.lat, location.lng], 13);  // Zoom to the found location
                    L.marker([location.lat, location.lng]).addTo(map)  // Place a marker
                        .bindPopup('Location: ' + searchTerm)
                        .openPopup();
                } else {
                    alert('Location not found');
                }
            })
            .catch(error => {
                alert('Error fetching location data');
            });
    } else {
        alert('Please enter a search term');
    }
}
