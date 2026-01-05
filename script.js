/**
 * StreetView Pro - Eugene Oregon Edition
 * Starting View: Satellite
 */

const MLY_ACCESS_TOKEN = 'MLY|25451962234457270|587e6bbe253fe0be7efcfa8ead799149';

// 1. Map Layers
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
    layers: [layers.satellite], 
    zoomControl: false
});

let mlyViewer = null;

// 3. UI Element References
const elements = {
    styleDropdown: document.getElementById('map-styles'),
    locationInput: document.getElementById('location-input'),
    searchBtn: document.getElementById('search-btn'),
    dragPin: document.getElementById('drag-indicator'),
    closeMlyBtn: document.getElementById('close-mly'),
    mlyContainer: document.getElementById('mly')
};

// 4. Style Switcher
if (elements.styleDropdown) {
    elements.styleDropdown.addEventListener('change', (e) => {
        Object.values(layers).forEach(layer => map.removeLayer(layer));
        if (layers[e.target.value]) layers[e.target.value].addTo(map);
    });
}

// 5. Search Logic
async function performSearch() {
    const query = elements.locationInput.value;
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
        console.error("Search error", err);
    }
}

if (elements.searchBtn) elements.searchBtn.onclick = performSearch;
if (elements.locationInput) {
    elements.locationInput.onkeypress = (e) => { if (e.key === 'Enter') performSearch(); };
}

// 6. Street View Logic
function openStreetView(lat, lon) {
    if (!mlyViewer) {
        mlyViewer = new mapillary.Viewer({
            accessToken: MLY_ACCESS_TOKEN,
            container: 'mly',
            component: { cover: false, stockControls: true }
        });
    }

    mlyViewer.moveCloseTo(lat, lon)
        .then(() => {
            elements.mlyContainer.style.display = 'block';
            elements.closeMlyBtn.classList.remove('hidden');
        })
        .catch(() => {
            alert("No Street View imagery available here. Try a main road.");
        });
}

if (elements.closeMlyBtn) {
    elements.closeMlyBtn.onclick = () => {
        elements.mlyContainer.style.display = 'none';
        elements.closeMlyBtn.classList.add('hidden');
    };
}

// 7. Fixed Mobile Dragging
if (elements.dragPin) {
    elements.dragPin.onpointerdown = function(e) {
        elements.dragPin.setPointerCapture(e.pointerId);
        map.dragging.disable();
        
        const onPointerUp = (ev) => {
            map.dragging.enable();
            elements.dragPin.releasePointerCapture(e.pointerId);
            
            const pixelPoint = L.point(ev.clientX, ev.clientY);
            const coords = map.containerPointToLatLng(pixelPoint);
            
            openStreetView(coords.lat, coords.lng);
            elements.dragPin.removeEventListener('pointerup', onPointerUp);
        };
        elements.dragPin.addEventListener('pointerup', onPointerUp);
    };
}