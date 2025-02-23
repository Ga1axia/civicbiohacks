// Function to format collector name
function formatCollectorName(name) {
    if (!name) return '';
    
    // First, handle names that might be in camelCase or PascalCase
    const spacedName = name.replace(/([A-Z])/g, ' $1').trim();
    
    // Remove any extra spaces and ensure proper capitalization
    return spacedName
        .split(' ')
        .filter(part => part.length > 0)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

// Function to update the popup with GBIF data
function updatePopup(gbifData) {
    const dataContainer = document.getElementById('data-container');
    const noDataMessage = document.getElementById('no-data');
    const bionomiaFrame = document.getElementById('bionomia-frame');
    const worldviewLink = document.getElementById('worldview-link');
    
    if (gbifData && gbifData.data) {
        // Show data container and hide no-data message
        dataContainer.style.display = 'block';
        noDataMessage.style.display = 'none';
        
        // Update the info fields
        document.getElementById('latitude').textContent = gbifData.data.latitude || 'Not available';
        document.getElementById('longitude').textContent = gbifData.data.longitude || 'Not available';
        document.getElementById('collection-date').textContent = gbifData.data.collectionDate || 'Not available';
        
        // Format and display collector name
        const collectorName = formatCollectorName(gbifData.data.collectorName);
        document.getElementById('collector-name').textContent = collectorName || 'Not available';
        
        // Update Bionomia iframe if collector name is available
        if (collectorName && collectorName !== 'Not available') {
            const searchUrl = `https://bionomia.net/roster?q=${encodeURIComponent(collectorName)}`;
            bionomiaFrame.src = searchUrl;
        }

        // Update Worldview link if coordinates are available
        if (gbifData.data.latitude && gbifData.data.longitude) {
            const lat = parseFloat(gbifData.data.latitude);
            const lon = parseFloat(gbifData.data.longitude);
            const worldviewUrl = createWorldviewUrl(lat, lon);
            worldviewLink.href = worldviewUrl;
        }
    } else {
        // Show no-data message and hide data container
        dataContainer.style.display = 'none';
        noDataMessage.style.display = 'block';
    }
}

function createWorldviewUrl(lat, lon, date) {
    const padding = 2;
    const layers = [
        'Reference_Labels_15m(hidden)',
        'Reference_Features_15m(hidden)',
        'Coastlines_15m',
        'BlueMarble_NextGeneration(hidden)',
        'VIIRS_NOAA21_CorrectedReflectance_TrueColor(hidden)',
        'VIIRS_NOAA20_CorrectedReflectance_TrueColor(hidden)',
        'VIIRS_SNPP_CorrectedReflectance_TrueColor(hidden)',
        'MODIS_Aqua_CorrectedReflectance_TrueColor(hidden)',
        'MODIS_Terra_CorrectedReflectance_TrueColor(hidden)'
    ].join(',');
    
    const worldviewUrl = new URL('https://worldview.earthdata.nasa.gov/');
    worldviewUrl.searchParams.set('v', `${lon-padding},${lat-padding},${lon+padding},${lat+padding}`);
    worldviewUrl.searchParams.set('l', layers);
    worldviewUrl.searchParams.set('lg', 'true');
    worldviewUrl.searchParams.set('t', '2025-02-22-T02:37:36Z');
    
    return worldviewUrl.toString();
}

function createNeoUrl(date) {
    return 'https://neo.gsfc.nasa.gov/view.php?datasetId=MOD_LSTD_CLIM_M';
}

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateGBIFData') {
        updatePopup(message.data);
    }
});

// When popup opens, query the active tab
document.addEventListener('DOMContentLoaded', () => {
    // Tab switching logic
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and content
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabName = tab.getAttribute('data-tab');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });

    // Existing DOMContentLoaded code
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab && currentTab.url && currentTab.url.includes('gbif.org/occurrence/')) {
            chrome.tabs.sendMessage(currentTab.id, { action: 'requestData' })
                .catch(error => {
                    console.error('Error requesting GBIF data:', error);
                });
        }
    });

    // Add image slider functionality
    const imageSlider = document.getElementById('image-slider');
    const prismImage = document.getElementById('prism-image');
    const yearDisplay = document.getElementById('year-display');

    const startYear = 1981;
    const endYear = 2024;
    const totalYears = endYear - startYear + 1; // 44 years

    // Preload images for smooth transitions
    const preloadedImages = [];
    for (let i = 1; i <= totalYears; i++) {
        const img = new Image();
        img.src = `prismimages/${i}.png`;
        preloadedImages.push(img);
    }

    // Update image and year display when slider moves
    imageSlider.addEventListener('input', (event) => {
        const imageNumber = parseInt(event.target.value);
        const year = startYear + imageNumber - 1;
        prismImage.src = `prismimages/${imageNumber}.png`;
        yearDisplay.textContent = year.toString();

        // Update dots
        updateDots(imageNumber);
    });

    // Create dot indicators (might want to reduce or group them due to the larger number)
    const dotsContainer = document.getElementById('slider-dots');
    for (let i = 0; i < totalYears; i++) {
        // Create dots only for every 5th year to avoid overcrowding
        if (i % 5 === 0) {
            const dot = document.createElement('div');
            dot.className = 'slider-dot';
            dot.addEventListener('click', () => {
                imageSlider.value = i + 1;
                imageSlider.dispatchEvent(new Event('input'));
            });
            dotsContainer.appendChild(dot);
        }
    }

    // Function to update dot indicators
    function updateDots(currentImage) {
        const dots = document.querySelectorAll('.slider-dot');
        dots.forEach((dot, index) => {
            // Match the dot to the nearest 5-year interval
            const dotYear = index * 5 + 1;
            dot.classList.toggle('active', 
                currentImage >= dotYear && 
                currentImage < dotYear + 5);
        });
    }

    // Initialize first image and dots
    updateDots(1);
    yearDisplay.textContent = startYear.toString();

    // Optional: Add keyboard navigation
    document.addEventListener('keydown', (event) => {
        if (!document.getElementById('maps-tab').classList.contains('active')) return;
        
        const currentValue = parseInt(imageSlider.value);
        if (event.key === 'ArrowRight' && currentValue < totalYears) {
            imageSlider.value = currentValue + 1;
            imageSlider.dispatchEvent(new Event('input'));
        } else if (event.key === 'ArrowLeft' && currentValue > 1) {
            imageSlider.value = currentValue - 1;
            imageSlider.dispatchEvent(new Event('input'));
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

// Helper function to get the appropriate year range for Impact Lab map
function getYearRange(year) {
    if (year < 2020) {
        return '1986-2005'; // Historical
    } else if (year < 2040) {
        return '2020-2039'; // Next 20 Years
    } else if (year < 2060) {
        return '2040-2059'; // Mid-Century
    } else {
        return '2080-2099'; // End of Century
    }
}
