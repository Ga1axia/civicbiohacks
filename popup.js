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


//function for gemini plugin
async function getSocioeconomicBackground(date, latitude, longitude) {
    // API key should be stored securely in environment variables
    const GEMINI_API_KEY = 'AIzaSyDEMcuUWOuWH7fZYdARWgkUYGu9SPhO630';

    try {
        // Input validation
        if (!date || !latitude || !longitude) {
            throw new Error('Date, latitude and longitude are required parameters');
        }

        // Format the prompt for Gemini
        const prompt = `Provide a brief socioeconomic background of the location at coordinates (${latitude}, ${longitude}) during ${date}. Include information about economic conditions, social structure, and major historical events if relevant.`;

        // Make API call to Google Gemini
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                    topP: 0.8
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('Invalid response format from Gemini API');
        }

        return data.candidates[0].content.parts[0].text;

    } catch (error) {
        console.error('Error fetching socioeconomic background:', error);
        return 'Unable to fetch socioeconomic background information.';
    }
}

// Example usage:
// getSocioeconomicBackground("1950", 40.7128, -74.0060)
//    .then(summary => console.log(summary))
//    .catch(error => console.error(error));
