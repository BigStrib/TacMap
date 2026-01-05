/**
 * StreetView Pro - Core Logic
 * Start Location: Eugene, Oregon
 * Default View: Satellite
 */

const MLY_ACCESS_TOKEN = 'MLY|25451962234457270|587e6bbe253fe0be7efcfa8ead799149';

// 1. Define Map Layers
const layers = {
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri'
    }),
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'OpenStreetMap'
    }),
    terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'OpenTopoMap'
    }),
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: 'CARTO'
    })
};

// 2. Initialize Map (Eugene, OR)
const map = L.map('map', {
    center: [44.0521, -123.0868],
    zoom: 15,
    layers: [layers.satellite], // Satellite default
    zoomControl: false          // Professional clean top
});

let mlyViewer = null;

// 3. Map Style Switcher Logic
const styleDropdown = document.getElementById('map-styles');
if (styleDropdown) {
    styleDropdown.addEventListener('change', (e) => {
        const selectedStyle = e.target.value;
        // Remove all current layers
        Object.values(layers).forEach(layer => map.removeLayer(layer));
        // Add the selected one
        if (layers[selectedStyle]) {
            layers[selectedStyle].addTo(map);
        }
    });
}

// 4. Search Functionality (Nominatim Fallback)
async function performSearch() {
    const query = document.getElementById('location-input').value;
    if (!query) return;

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const { lat, lon } = data[0];
            map.setView([lat, lon], 16);
        } else {
            alert("Location not found. Try a more specific address.");
        }
    } catch (error) {
        console.error("Search Error:", error);
        alert("Search service currently unavailable.");
    }
}

// 5. Mapillary Street View Logic
function openStreetView(lat, lon) {
    const mlyContainer = document.getElementById('mly');
    const closeBtn = document.getElementById('close-mly');

    // Lazy-load the viewer on first use
    if (!mlyViewer) {
        mlyViewer = new mapillary.Viewer({
            accessToken: MLY_ACCESS_TOKEN,
            container: 'mly',
            component: { 
                cover: false, 
                stockControls: true,
                direction: true
            }
        });
    }

    // Attempt to find imagery near the dropped point
    mlyViewer.moveCloseTo(lat, lon)
        .then(() => {
            mlyContainer.style.display = 'block';
            closeBtn.classList.remove('hidden');
        })
        .catch((err) => {
            // Requirement: Let user know if street view is unavailable
            alert("No Street View imagery found at this location. Try dropping the pin on a main road.");
            console.warn("Mapillary error:", err);
        });
}

function closeStreetView() {
    document.getElementById('mly').style.display = 'none';
    document.getElementById('close-mly').classList.add('hidden');
}

// 6. Professional Drag-and-Drop Pin Logic
const dragPin = document.getElementById('drag-indicator');

if (dragPin) {
    dragPin.onpointerdown = function(e) {
        // Prevent map panning while dragging the pin
        map.dragging.disable();
        dragPin.setPointerCapture(e.pointerId);
        
        const onPointerUp = (ev) => {
            // Re-enable map movement
            map.dragging.enable();
            dragPin.releasePointerCapture(e.pointerId);
            
            // Convert the release point (pixels) to GPS coordinates
            const pixelPoint = L.point(ev.clientX, ev.clientY);
            const coords = map.containerPointToLatLng(pixelPoint);
            
            openStreetView(coords.lat, coords.lng);
            
            // Clean up listener
            dragPin.removeEventListener('pointerup', onPointerUp);
        };

        dragPin.addEventListener('pointerup', onPointerUp);
    };
}

// 7. UI Event Listeners
const searchBtn = document.getElementById('search-btn');
if (searchBtn) {
    searchBtn.onclick = performSearch;
}

const locationInput = document.getElementById('location-input');
if (locationInput) {
    locationInput.onkeypress = (e) => {
        if (e.key === 'Enter') performSearch();
    };
}

const closeBtn = document.getElementById('close-mly');
if (closeBtn) {
    closeBtn.onclick = closeStreetView;
}