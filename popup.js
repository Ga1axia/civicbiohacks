// Function to update the popup with GBIF data
function updatePopup(gbifData) {
    const dataContainer = document.getElementById('data-container');
    const noDataMessage = document.getElementById('no-data');
    
    if (gbifData && gbifData.data) {
        // Show data container and hide no-data message
        dataContainer.style.display = 'block';
        noDataMessage.style.display = 'none';
        
        // Update the fields
        document.getElementById('latitude').textContent = gbifData.data.latitude || 'Not available';
        document.getElementById('longitude').textContent = gbifData.data.longitude || 'Not available';
        document.getElementById('collection-date').textContent = gbifData.data.collectionDate || 'Not available';
        document.getElementById('collector-name').textContent = gbifData.data.collectorName || 'Not available';
    } else {
        // Show no-data message and hide data container
        dataContainer.style.display = 'none';
        noDataMessage.style.display = 'block';
    }
}

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateGBIFData') {
        updatePopup(message.data);
    }
});

// When popup opens, query the active tab
document.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab && currentTab.url && currentTab.url.includes('gbif.org/occurrence/')) {
            // Request data from content script
            chrome.tabs.sendMessage(currentTab.id, { action: 'requestData' })
                .catch(error => {
                    console.error('Error requesting GBIF data:', error);
                });
        }
    });
});

// Function to search for a location and move the map
function searchLocation() {
    let searchTerm = document.getElementById('search-bar').value;

    if (searchTerm) {
        // Use the OpenCage Geocoding API to get latitude and longitude
        const apiKey = 'YOUR_OPENCAGE_API_KEY'; // Replace with your OpenCage API Key
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${searchTerm}&key=${apiKey}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.results && data.results.length > 0) {
                    let location = data.results[0].geometry;
                    
                    // Zoom to the found location
                    map.setView([location.lat, location.lng], 13);
                    
                    // Place a marker
                    L.marker([location.lat, location.lng])
                        .addTo(map)
                        .bindPopup(`Location: ${searchTerm}`)
                        .openPopup();
                } else {
                    alert('Location not found');
                }
            })
            .catch(error => {
                alert('Error fetching location data');
                console.error(error);
            });
    } else {
        alert('Please enter a search term');
    }
}

// Function for Gemini plugin
async function getSocioeconomicBackground(date, latitude, longitude) {
    // API key should be stored securely in environment variables
    const GEMINI_API_KEY = 'AIzaSyDEMcuUWOuWH7fZYdARWgkUYGu9SPhO630';

    try {
        // Input validation
        if (!date || !latitude || !longitude) {
            throw new Error('Date, latitude, and longitude are required parameters');
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
                    parts: [{ text: prompt }]
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
//     .then(summary => console.log(summary))
//     .catch(error => console.error(error));
