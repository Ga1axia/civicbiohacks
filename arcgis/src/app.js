// @ts-nocheck
import Map from "@arcgis/core/Map.js";
import MapView from "@arcgis/core/views/MapView.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import TimeExtent from "@arcgis/core/TimeExtent.js";
import Portal from "@arcgis/core/portal/Portal.js";
import { searchLocation } from "./searchLocation.js";
import { initializeAuth } from "./config.js";
import IdentityManager from "@arcgis/core/identity/IdentityManager.js";

// Initialize authentication immediately
async function initializeApp() {
    try {
        await ensureAuthenticated();
        await initializeMap();
        
        // Load Living Atlas layers automatically
        const layers = await queryFeatureLayers();
        displayLayers(layers, 'Living Atlas Layers');

        // Initialize Living Atlas search
        const searchInput = document.getElementById('layer-search');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(async (e) => {
                const results = await queryFeatureLayers(e.target.value);
                displayLayers(results, 'Living Atlas Layers');
            }, 300));
        }
        
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Initialize map
const arcGISMap = new Map({
    basemap: "streets-vector"
});

const view = new MapView({
    container: "map",
    map: arcGISMap,
    zoom: 12,
    center: [-77.036, 38.889] // Default to Washington DC
});

const graphicsLayer = new GraphicsLayer();
arcGISMap.add(graphicsLayer);

// Store active layers using plain objects
const activeLayerIds = new Set();
const layerRegistry = {};

// Function to ensure user is authenticated
async function ensureAuthenticated() {
    try {
        // First try to use existing credentials
        const credential = await IdentityManager.getCredential(
            "https://www.arcgis.com/sharing/rest",
            { prompt: false }
        );
        return credential;
    } catch (error) {
        console.log("No existing credentials, initializing auth...");
        // Try to initialize auth with client credentials
        const success = await initializeAuth();
        if (!success) {
            throw new Error("Authentication failed");
        }
        return IdentityManager.getCredential(
            "https://www.arcgis.com/sharing/rest",
            { prompt: false }
        );
    }
}

// Function to add a point to the map
function addPointToMap(lat, lng) {
    graphicsLayer.removeAll();
    
    const point = {
        type: "point",
        longitude: lng,
        latitude: lat
    };

    const markerSymbol = {
        type: "simple-marker",
        color: [226, 119, 40],
        outline: {
            color: [255, 255, 255],
            width: 2
        }
    };

    const pointGraphic = new Graphic({
        geometry: point,
        symbol: markerSymbol
    });

    graphicsLayer.add(pointGraphic);
    view.goTo({ target: pointGraphic, zoom: 14 });

    // Update ArcGIS link with datetime if available
    const arcgisLink = document.getElementById('arcgis-link');
    const datetimeInput = document.getElementById('datetime-input');
    const dateParam = datetimeInput.value ? `&time=${encodeURIComponent(datetimeInput.value)}` : '';
    const arcgisUrl = `https://www.arcgis.com/apps/mapviewer/index.html?center=${lng},${lat}&level=14${dateParam}`;
    arcgisLink.href = arcgisUrl;

    // Update time extent for time-aware layers
    if (datetimeInput.value) {
        const date = new Date(datetimeInput.value);
        updateTimeExtent(date);
    }
}

// Function to update time extent for all time-aware layers
function updateTimeExtent(date) {
    const timeExtent = new TimeExtent({
        start: date,
        end: new Date(date.getTime() + (24 * 60 * 60 * 1000)) // Add 24 hours
    });

    // Update each time-aware layer
    Object.values(layerRegistry).forEach(layer => {
        if (layer.timeInfo) {
            layer.timeExtent = timeExtent;
        }
    });
}

// Function to add a feature layer
async function addFeatureLayer(url, title) {
    try {
        console.log('Adding layer:', url);
        const layer = new FeatureLayer({
            url: url,
            outFields: ["*"],
            title: title || `Layer ${activeLayerIds.size + 1}`,
            popupEnabled: true
        });

        // Wait for the layer to load to verify it's valid
        await layer.load();
        console.log('Layer loaded successfully:', layer);

        // If layer is time-aware and we have a datetime selected, set the time extent
        const datetimeInput = document.getElementById('datetime-input');
        if (layer.timeInfo && datetimeInput.value) {
            const date = new Date(datetimeInput.value);
            const timeExtent = new TimeExtent({
                start: date,
                end: new Date(date.getTime() + (24 * 60 * 60 * 1000)) // Add 24 hours
            });
            layer.timeExtent = timeExtent;
        }

        arcGISMap.add(layer);
        activeLayerIds.add(layer.id);
        layerRegistry[layer.id] = layer;
        updateLayerList();
        return layer;
    } catch (error) {
        console.error('Error adding layer:', error);
        console.error('Error details:', {
            url: url,
            title: title,
            errorMessage: error.message,
            errorDetails: error.details
        });
        alert(`Error adding layer: ${error.message}`);
        return null;
    }
}

// Function to remove a feature layer
function removeFeatureLayer(layerId) {
    const layer = layerRegistry[layerId];
    if (layer) {
        arcGISMap.remove(layer);
        activeLayerIds.delete(layerId);
        delete layerRegistry[layerId];
        updateLayerList();
    }
}

// Function to update the layer list in the UI
function updateLayerList() {
    const layerList = document.getElementById('layer-list');
    layerList.innerHTML = '';

    activeLayerIds.forEach(id => {
        const layer = layerRegistry[id];
        if (!layer) return;

        const item = document.createElement('div');
        item.className = 'layer-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = layer.visible;
        checkbox.addEventListener('change', () => {
            layer.visible = checkbox.checked;
        });

        const label = document.createElement('label');
        label.textContent = layer.title;

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = () => removeFeatureLayer(id);

        item.appendChild(checkbox);
        item.appendChild(label);
        item.appendChild(removeBtn);
        layerList.appendChild(item);
    });
}

// Function to query feature layers
async function queryFeatureLayers(searchTerm = '') {
    try {
        await ensureAuthenticated();
        const portal = new Portal();
        await portal.load();
        
        const groupId = "47dd57c9a59d458c86d3d6b978560088"; // Living Atlas group ID
        
        const baseFilter = `(type:"Map Service" OR type:"Image Service" OR type:"Feature Service" OR type:"Vector Tile Service" OR type:"OGCFeatureServer" OR type:"WMS" OR type:"WFS" OR type:"WMTS" OR type:"KML" OR type:"Stream Service" OR type:"Feed" OR type:"Media Layer" OR type:"Group Layer" OR type:"GeoJson" OR type:"Knowledge Graph Service" OR type:"Knowledge Graph Layer") -typekeywords:"Table"`;
        
        const query = {
            q: searchTerm ? `${baseFilter} AND (${searchTerm})` : baseFilter,
            num: 60,
            start: 1,
            sortField: "modified",
            sortOrder: "desc"
        };

        const response = await portal.queryGroups({
            query: groupId
        });

        if (response.results.length > 0) {
            const group = response.results[0];
            const items = await group.queryItems(query);
            return items.results;
        }
        
        return [];
    } catch (error) {
        console.error('Error querying feature layers:', error);
        throw error;
    }
}

// Function to display layers in the list
function displayLayers(layers, title) {
    const layerList = document.getElementById('layer-list');
    layerList.innerHTML = '';

    if (!layers || layers.length === 0) {
        const noResults = document.createElement('p');
        noResults.textContent = 'No layers found';
        noResults.style.textAlign = 'center';
        noResults.style.color = '#666';
        layerList.appendChild(noResults);
        return;
    }

    const layersContainer = document.createElement('div');
    layersContainer.style.maxHeight = '500px';
    layersContainer.style.overflowY = 'auto';
    layersContainer.style.paddingRight = '10px';

    layers.forEach(layer => {
        const item = document.createElement('div');
        item.className = 'layer-item';

        // Content container (left side)
        const content = document.createElement('div');
        content.className = 'layer-content';

        const title = document.createElement('a');
        title.href = '#';
        title.textContent = layer.title;
        title.className = 'layer-title';
        content.appendChild(title);

        if (layer.snippet || layer.description) {
            const description = document.createElement('div');
            description.className = 'layer-description';
            const text = layer.snippet || layer.description?.substring(0, 200);
            if (text) {
                description.textContent = text + (text.length >= 200 ? '...' : '');
                content.appendChild(description);
            }
        }

        if (layer.modified) {
            const metadata = document.createElement('div');
            metadata.className = 'layer-metadata';
            const date = new Date(layer.modified);
            metadata.textContent = `Updated: ${date.toLocaleDateString()}`;
            content.appendChild(metadata);
        }

        // Add Layer button (right side)
        const addButton = document.createElement('button');
        addButton.textContent = 'Add Layer';
        addButton.className = 'add-layer-btn';
        addButton.onclick = () => addLayerToMap(layer);

        item.appendChild(content);
        item.appendChild(addButton);
        layersContainer.appendChild(item);
    });

    layerList.appendChild(layersContainer);
}

async function addLayerToMap(layer) {
    try {
        const featureLayer = new FeatureLayer({
            url: layer.url,
            title: layer.title
        });
        arcGISMap.add(featureLayer);
    } catch (error) {
        console.error('Error adding layer:', error);
        alert('Error adding layer. Please check the console for details.');
    }
}

// Initialize browse layers button
document.getElementById('browse-layers-btn').addEventListener('click', async () => {
    try {
        const results = await queryFeatureLayers();
        displayLayers(results, 'Living Atlas Layers');
    } catch (error) {
        console.error('Error loading layers:', error);
        const layerList = document.getElementById('layer-list');
        layerList.innerHTML = '<p style="color: red;">Error loading layers. Please try again.</p>';
    }
});

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Start the app initialization
initializeApp().catch(console.error);
