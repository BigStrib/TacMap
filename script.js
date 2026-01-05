const MLY_ACCESS_TOKEN = 'MLY|25451962234457270|587e6bbe253fe0be7efcfa8ead799149';

// Map Style Library
const layers = {
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'),
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
    terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'),
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png')
};

// Initialize Map in Eugene, OR
const map = L.map('map', {
    center: [44.0521, -123.0868],
    zoom: 14,
    layers: [layers.satellite], // Satellite is now default
    zoomControl: false
});

let mlyViewer = null;

// Style Switcher
document.getElementById('map-styles').addEventListener('change', (e) => {
    Object.values(layers).forEach(layer => map.removeLayer(layer));
    layers[e.target.value].addTo(map);
});

// Search functionality
async function searchLocation(query) {
    if (!query) return;
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data && data.length > 0) {
            map.setView([data[0].lat, data[0].lon], 16);
        } else {
            alert("Location not found.");
        }
    } catch (err) {
        console.error("Search failed", err);
    }
}

// Street View Interaction Logic
function openStreetView(lat, lon) {
    const mlyDiv = document.getElementById('mly');
    const closeBtn = document.getElementById('close-mly');

    if (!mlyViewer) {
        mlyViewer = new mapillary.Viewer({
            accessToken: MLY_ACCESS_TOKEN,
            container: 'mly',
            component: { cover: false, stockControls: true }
        });
    }

    // Imagery Availability Check
    mlyViewer.moveCloseTo(lat, lon)
        .then(() => {
            mlyDiv.style.display = 'block';
            closeBtn.classList.remove('hidden');
        })
        .catch(() => {
            // If no street view is available, alert user and keep viewer closed
            alert("No Street View imagery available here. Please try a main road.");
        });
}

function closeStreetView() {
    document.getElementById('mly').style.display = 'none';
    document.getElementById('close-mly').classList.add('hidden');
}

// Draggable Pin Interaction
const dragPin = document.getElementById('drag-indicator');

dragPin.onpointerdown = function(e) {
    // 1. Capture the pointer so movement is tracked even if it leaves the button area
    dragPin.setPointerCapture(e.pointerId);
    
    // 2. Disable map dragging so the map doesn't move while you are placing the pin
    map.dragging.disable();
    dragPin.style.cursor = 'grabbing';

    const onPointerUp = (ev) => {
        // 3. Re-enable map dragging
        map.dragging.enable();
        dragPin.style.cursor = 'grab';
        dragPin.releasePointerCapture(e.pointerId);
        
        // 4. Calculate the drop point relative to the screen
        const point = L.point(ev.clientX, ev.clientY);
        
        // 5. Convert that pixel point into a Map Latitude/Longitude
        const latLng = map.containerPointToLatLng(point);
        
        // 6. Launch Street View
        openStreetView(latLng.lat, latLng.lng);
        
        // Cleanup listeners
        dragPin.removeEventListener('pointerup', onPointerUp);
    };

    dragPin.addEventListener('pointerup', onPointerUp);
};

document.getElementById('search-btn').onclick = () => searchLocation(document.getElementById('location-input').value);
document.getElementById('close-mly').onclick = closeStreetView;