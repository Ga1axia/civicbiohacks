// Function to extract data from GBIF occurrence page
function extractGBIFData() {
    // Initialize data object
    const data = {
        latitude: null,
        longitude: null,
        collectionDate: null,
        collectorName: null
    };

    try {
        // Function to find a cell value by term name
        const findCellByTerm = (termName) => {
            const termCell = Array.from(document.querySelectorAll('td')).find(td => 
                td.textContent.trim().toLowerCase() === termName.toLowerCase()
            );
            if (termCell) {
                const row = termCell.parentElement;
                const valueCell = row.querySelector('td:nth-child(2)');
                return valueCell ? valueCell.textContent.trim() : null;
            }
            return null;
        };

        // Extract data using the correct terms
        data.latitude = findCellByTerm('decimal latitude');
        data.longitude = findCellByTerm('decimal longitude');
        data.collectionDate = findCellByTerm('date identified');
        data.collectorName = findCellByTerm('identified by');

        // Store the data
        const gbifData = {
            url: window.location.href,
            data: data
        };

        console.log('Extracted GBIF data:', gbifData); // Debug log

        // Send data to popup
        chrome.runtime.sendMessage({
            action: 'updateGBIFData',
            data: gbifData
        });
    } catch (error) {
        console.error('Error extracting GBIF data:', error);
    }
}

// Function to wait for content to load
function waitForContent() {
    const maxAttempts = 20;
    let attempts = 0;

    const checkContent = setInterval(() => {
        attempts++;
        // Check if the tables are loaded
        if (document.querySelector('.table--compact') || attempts >= maxAttempts) {
            clearInterval(checkContent);
            if (attempts < maxAttempts) {
                extractGBIFData();
            }
        }
    }, 500);
}

// Run when the page loads
if (window.location.href.includes('gbif.org/occurrence/')) {
    waitForContent();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'requestData') {
        waitForContent();
    }
});
