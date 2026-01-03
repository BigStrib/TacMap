/* ============================================ */
/* TACTICAL COMMAND MAP - MAIN APPLICATION */
/* ============================================ */

(function() {
    'use strict';

    /* ============================================ */
    /* CONFIGURATION */
    /* ============================================ */
    const CONFIG = {
        home: {
            lat: 34.0522,
            lng: -118.2437,
            zoom: 12,
            name: "Los Angeles, CA"
        },
        biasRadiusMiles: 75,
        biasRadiusKm: 120.7,
        searchDebounceMs: 350,
        maxSearchResults: 10,
        maxHistoryItems: 10,
        flyToDuration: 1.5,
        defaultZoom: 18,
        maxZoom: 19,
        minZoom: 3,
        requestTimeoutMs: 8000,
        mapillaryTimeoutMs: 5000,
        mapillaryAccessToken: 'MLY|25451962234457270|587e6bbe253fe0be7efcfa8ead799149',
        storageKeys: {
            history: 'tactical_history',
            layer: 'tactical_layer',
            overlays: 'tactical_overlays'
        }
    };

    /* ============================================ */
    /* TILE PROVIDERS WITH FALLBACKS */
    /* ============================================ */
    const TILE_PROVIDERS = {
        streets: {
            layers: [
                {
                    name: 'CartoDB Voyager',
                    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                    attribution: '© OpenStreetMap © CARTO',
                    maxZoom: 20,
                    maxNativeZoom: 20,
                    subdomains: 'abcd'
                },
                {
                    name: 'OpenStreetMap',
                    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 19,
                    maxNativeZoom: 19,
                    subdomains: 'abc'
                }
            ]
        },
        satellite: {
            layers: [
                {
                    name: 'Esri World Imagery',
                    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                    attribution: '© Esri, Maxar, Earthstar Geographics',
                    maxZoom: 19,
                    maxNativeZoom: 18
                }
            ]
        },
        dark: {
            layers: [
                {
                    name: 'CartoDB Dark Matter',
                    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                    attribution: '© OpenStreetMap © CARTO',
                    maxZoom: 20,
                    maxNativeZoom: 20,
                    subdomains: 'abcd'
                }
            ]
        },
        hybrid: {
            layers: [
                {
                    name: 'Esri World Imagery',
                    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                    attribution: '© Esri',
                    maxZoom: 19,
                    maxNativeZoom: 18
                }
            ],
            overlays: [
                {
                    name: 'CartoDB Labels',
                    url: 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
                    maxZoom: 20,
                    subdomains: 'abcd'
                }
            ]
        }
    };

    /* ============================================ */
    /* GEOCODING PROVIDERS */
    /* ============================================ */
    const GEOCODE_PROVIDERS = [
        {
            name: 'Photon',
            type: 'photon',
            url: 'https://photon.komoot.io/api/'
        },
        {
            name: 'Nominatim',
            type: 'nominatim',
            url: 'https://nominatim.openstreetmap.org/search'
        },
        {
            name: 'ArcGIS',
            type: 'arcgis',
            url: 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates'
        }
    ];

    const REVERSE_GEOCODE_PROVIDERS = [
        {
            name: 'Nominatim',
            type: 'nominatim',
            url: 'https://nominatim.openstreetmap.org/reverse'
        },
        {
            name: 'ArcGIS',
            type: 'arcgis',
            url: 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode'
        }
    ];

    /* ============================================ */
    /* APPLICATION STATE */
    /* ============================================ */
    const state = {
        map: null,
        currentBaseLayer: null,
        currentOverlays: [],
        currentLayer: 'streets',
        currentMarker: null,
        currentLocation: null,
        streetViewMarker: null,
        isDraggingStreetView: false,
        streetViewDropLocation: null,
        mapillaryViewer: null,
        isStreetViewOpen: false,
        searchHistory: [],
        searchResults: [],
        isSearching: false,
        abortController: null,
        activeResultIndex: -1,
        lastQuery: '',
        userLocation: null,
        biasLocation: null,
        providerFailures: {},
        currentProvider: 'Photon',
        overlays: {
            labels: true,
            houseNumbers: true,
            buildings: false
        },
        maxZoomReached: false
    };

    /* ============================================ */
    /* DOM ELEMENTS */
    /* ============================================ */
    let elements = {};

    function cacheElements() {
        elements = {
            appContainer: document.getElementById('appContainer'),
            mapPanel: document.getElementById('mapPanel'),
            map: document.getElementById('map'),
            streetViewPanel: document.getElementById('streetViewPanel'),
            streetViewLocation: document.getElementById('streetViewLocation'),
            closeStreetView: document.getElementById('closeStreetView'),
            mapillaryViewer: document.getElementById('mapillaryViewer'),
            streetViewLoading: document.getElementById('streetViewLoading'),
            streetViewEmpty: document.getElementById('streetViewEmpty'),
            resizeHandle: document.getElementById('resizeHandle'),
            maxZoomWarning: document.getElementById('maxZoomWarning'),
            errorNotification: document.getElementById('errorNotification'),
            errorMessage: document.getElementById('errorMessage'),
            searchInput: document.getElementById('searchInput'),
            searchBtn: document.getElementById('searchBtn'),
            clearSearch: document.getElementById('clearSearch'),
            searchDropdown: document.getElementById('searchDropdown'),
            searchResults: document.getElementById('searchResults'),
            searchLoading: document.getElementById('searchLoading'),
            searchError: document.getElementById('searchError'),
            resultCount: document.getElementById('resultCount'),
            myLocationBtn: document.getElementById('myLocationBtn'),
            streetViewBtn: document.getElementById('streetViewBtn'),
            zoomIn: document.getElementById('zoomIn'),
            zoomOut: document.getElementById('zoomOut'),
            homeBtn: document.getElementById('homeBtn'),
            rotateBtn: document.getElementById('rotateBtn'),
            layerBtn: document.getElementById('layerBtn'),
            layerPanel: document.getElementById('layerPanel'),
            closeLayerPanel: document.getElementById('closeLayerPanel'),
            layerOptions: document.querySelectorAll('.layer-option'),
            toggleLabels: document.getElementById('toggleLabels'),
            toggleHouseNumbers: document.getElementById('toggleHouseNumbers'),
            toggleBuildings: document.getElementById('toggleBuildings'),
            historySidebar: document.getElementById('historySidebar'),
            historyToggle: document.getElementById('historyToggle'),
            historyCount: document.getElementById('historyCount'),
            historyList: document.getElementById('historyList'),
            historyEmpty: document.getElementById('historyEmpty'),
            clearHistory: document.getElementById('clearHistory'),
            locationCard: document.getElementById('locationCard'),
            closeLocationCard: document.getElementById('closeLocationCard'),
            locationTitle: document.getElementById('locationTitle'),
            locationAddress: document.getElementById('locationAddress'),
            locationLat: document.getElementById('locationLat'),
            locationLng: document.getElementById('locationLng'),
            locationType: document.getElementById('locationType'),
            locationDistance: document.getElementById('locationDistance'),
            copyCoords: document.getElementById('copyCoords'),
            openStreetViewCard: document.getElementById('openStreetViewCard'),
            openGoogleMaps: document.getElementById('openGoogleMaps'),
            maxZoomBtn: document.getElementById('maxZoomBtn'),
            cursorCoords: document.getElementById('cursorCoords'),
            zoomLevel: document.getElementById('zoomLevel'),
            currentLayerDisplay: document.getElementById('currentLayer'),
            mapStatus: document.getElementById('mapStatus'),
            providerStatus: document.getElementById('providerStatus'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            loadingBar: document.getElementById('loadingBar'),
            toastContainer: document.getElementById('toastContainer'),
            shortcutsModal: document.getElementById('shortcutsModal'),
            closeShortcuts: document.getElementById('closeShortcuts')
        };
    }

    /* ============================================ */
    /* UTILITY FUNCTIONS */
    /* ============================================ */
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function calculateDistance(lat1, lon1, lat2, lon2, unit) {
        unit = unit || 'miles';
        const R = unit === 'miles' ? 3959 : 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function toRad(deg) {
        return deg * (Math.PI / 180);
    }

    function formatDistance(miles) {
        if (miles < 0.1) {
            return Math.round(miles * 5280) + ' ft';
        }
        if (miles < 10) {
            return miles.toFixed(1) + ' mi';
        }
        return Math.round(miles) + ' mi';
    }

    function formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        return Math.floor(seconds / 86400) + 'd ago';
    }

    function generateId() {
        return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    function saveStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            return false;
        }
    }

    function loadStorage(key, fallback) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    /* ============================================ */
    /* TOAST NOTIFICATIONS */
    /* ============================================ */
    function showToast(message, type, duration) {
        type = type || 'info';
        duration = duration !== undefined ? duration : 4000;
        
        const icons = {
            success: 'check',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };

        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.innerHTML = 
            '<span class="toast-icon"><i class="fas fa-' + icons[type] + '"></i></span>' +
            '<span class="toast-message">' + escapeHtml(message) + '</span>' +
            '<button class="toast-close"><i class="fas fa-times"></i></button>';

        elements.toastContainer.appendChild(toast);

        toast.querySelector('.toast-close').addEventListener('click', function() {
            removeToast(toast);
        });

        if (duration > 0) {
            setTimeout(function() {
                removeToast(toast);
            }, duration);
        }

        return toast;
    }

    function removeToast(toast) {
        if (!toast || !toast.parentNode) return;
        toast.classList.add('toast-exit');
        setTimeout(function() {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    function showErrorNotification(message) {
        message = message || 'No street imagery available at this location';
        elements.errorMessage.textContent = message;
        elements.errorNotification.classList.remove('hidden');
        
        setTimeout(function() {
            elements.errorNotification.classList.add('hidden');
        }, 3000);
    }

    /* ============================================ */
    /* MAP INITIALIZATION */
    /* ============================================ */
    async function initializeMap() {
        console.log('🗺️ Initializing Tactical Map...');
        updateLoadingProgress(10);

        state.map = L.map('map', {
            center: [CONFIG.home.lat, CONFIG.home.lng],
            zoom: CONFIG.home.zoom,
            zoomControl: false,
            attributionControl: false,
            maxZoom: 22,
            minZoom: CONFIG.minZoom
        });

        updateLoadingProgress(30);

        const savedLayer = loadStorage(CONFIG.storageKeys.layer, 'streets');
        state.currentLayer = savedLayer;

        const savedOverlays = loadStorage(CONFIG.storageKeys.overlays, null);
        if (savedOverlays) {
            state.overlays = Object.assign({}, state.overlays, savedOverlays);
        }

        await setMapLayer(state.currentLayer);
        updateLoadingProgress(60);

        setupMapEvents();
        updateLoadingProgress(70);

        initializeStreetViewPegman();
        updateLoadingProgress(80);

        await initializeLocationBias();
        updateLoadingProgress(90);

        loadSearchHistory();
        updateLayerUI();
        updateOverlayToggles();

        updateLoadingProgress(100);

        setTimeout(function() {
            elements.loadingOverlay.classList.add('hidden');
            showToast('Map ready. Drag the red icon to view streets.', 'success', 4000);
        }, 500);

        console.log('✅ Tactical Map initialized');
    }

    function updateLoadingProgress(percent) {
        if (elements.loadingBar) {
            elements.loadingBar.style.width = percent + '%';
            elements.loadingBar.style.animation = 'none';
        }
    }

    /* ============================================ */
    /* STREET VIEW PEGMAN */
    /* ============================================ */
    function initializeStreetViewPegman() {
        addPegmanStyles();
        createFloatingPegman();
    }

    function addPegmanStyles() {
        const style = document.createElement('style');
        style.textContent = 
            '.street-view-pegman-floating {' +
            '  position: fixed;' +
            '  bottom: 100px;' +
            '  right: 70px;' +
            '  z-index: 1000;' +
            '  cursor: grab;' +
            '  user-select: none;' +
            '  transition: transform 0.15s ease;' +
            '}' +
            '.street-view-pegman-floating:hover {' +
            '  transform: scale(1.1);' +
            '}' +
            '.street-view-pegman-floating:active {' +
            '  cursor: grabbing;' +
            '  transform: scale(1.2);' +
            '}' +
            '.street-view-pegman-floating.dragging {' +
            '  opacity: 0.8;' +
            '  cursor: grabbing;' +
            '  transform: scale(1.3);' +
            '  z-index: 2000;' +
            '}' +
            '.pegman-container {' +
            '  position: relative;' +
            '  width: 44px;' +
            '  height: 44px;' +
            '}' +
            '.pegman-icon {' +
            '  position: absolute;' +
            '  top: 50%;' +
            '  left: 50%;' +
            '  transform: translate(-50%, -50%);' +
            '  width: 40px;' +
            '  height: 40px;' +
            '  background: #8b0000;' +
            '  border: 3px solid #ff4444;' +
            '  border-radius: 50%;' +
            '  display: flex;' +
            '  align-items: center;' +
            '  justify-content: center;' +
            '  color: #fff;' +
            '  font-size: 18px;' +
            '  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.5);' +
            '}' +
            '.pegman-pulse {' +
            '  position: absolute;' +
            '  top: 50%;' +
            '  left: 50%;' +
            '  transform: translate(-50%, -50%);' +
            '  width: 40px;' +
            '  height: 40px;' +
            '  border: 2px solid #ff4444;' +
            '  border-radius: 50%;' +
            '  animation: pegman-pulse 2s infinite;' +
            '}' +
            '@keyframes pegman-pulse {' +
            '  0% { width: 40px; height: 40px; opacity: 1; }' +
            '  100% { width: 70px; height: 70px; opacity: 0; }' +
            '}' +
            '.pegman-tooltip {' +
            '  position: absolute;' +
            '  bottom: -30px;' +
            '  left: 50%;' +
            '  transform: translateX(-50%);' +
            '  background: #000;' +
            '  color: #fff;' +
            '  padding: 4px 8px;' +
            '  border-radius: 4px;' +
            '  font-size: 10px;' +
            '  white-space: nowrap;' +
            '  opacity: 0;' +
            '  transition: opacity 0.2s;' +
            '  pointer-events: none;' +
            '}' +
            '.street-view-pegman-floating:hover .pegman-tooltip {' +
            '  opacity: 1;' +
            '}' +
            '.street-view-drop-indicator {' +
            '  position: fixed;' +
            '  width: 60px;' +
            '  height: 60px;' +
            '  pointer-events: none;' +
            '  z-index: 1500;' +
            '}' +
            '.drop-indicator-ring {' +
            '  position: absolute;' +
            '  top: 50%;' +
            '  left: 50%;' +
            '  transform: translate(-50%, -50%);' +
            '  width: 50px;' +
            '  height: 50px;' +
            '  border: 3px dashed #ff4444;' +
            '  border-radius: 50%;' +
            '  animation: drop-pulse 1s infinite;' +
            '}' +
            '@keyframes drop-pulse {' +
            '  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }' +
            '  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.7; }' +
            '}' +
            '.drop-indicator-center {' +
            '  position: absolute;' +
            '  top: 50%;' +
            '  left: 50%;' +
            '  transform: translate(-50%, -50%);' +
            '  width: 12px;' +
            '  height: 12px;' +
            '  background: #ff4444;' +
            '  border-radius: 50%;' +
            '}' +
            '.sv-marker-icon {' +
            '  width: 32px;' +
            '  height: 32px;' +
            '  background: #8b0000;' +
            '  border: 3px solid #fff;' +
            '  border-radius: 50%;' +
            '  display: flex;' +
            '  align-items: center;' +
            '  justify-content: center;' +
            '  color: #fff;' +
            '  font-size: 14px;' +
            '  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);' +
            '}' +
            '.sv-marker-pulse {' +
            '  position: absolute;' +
            '  top: 50%;' +
            '  left: 50%;' +
            '  transform: translate(-50%, -50%);' +
            '  width: 32px;' +
            '  height: 32px;' +
            '  border: 2px solid #ff4444;' +
            '  border-radius: 50%;' +
            '  animation: sv-pulse 1.5s infinite;' +
            '}' +
            '@keyframes sv-pulse {' +
            '  0% { width: 32px; height: 32px; opacity: 1; }' +
            '  100% { width: 56px; height: 56px; opacity: 0; }' +
            '}';
        document.head.appendChild(style);
    }

    function createFloatingPegman() {
        const pegman = document.createElement('div');
        pegman.id = 'streetViewPegman';
        pegman.className = 'street-view-pegman-floating';
        pegman.innerHTML = 
            '<div class="pegman-container">' +
            '  <div class="pegman-icon"><i class="fas fa-street-view"></i></div>' +
            '  <div class="pegman-pulse"></div>' +
            '  <div class="pegman-tooltip">Drag to street</div>' +
            '</div>';

        document.body.appendChild(pegman);
        setupPegmanDragDrop(pegman);
    }

    function setupPegmanDragDrop(pegman) {
        let isDragging = false;
        let dropIndicator = null;

        pegman.addEventListener('mousedown', function(e) {
            e.preventDefault();
            startDrag(e.clientX, e.clientY);
        });

        pegman.addEventListener('touchstart', function(e) {
            const touch = e.touches[0];
            startDrag(touch.clientX, touch.clientY);
        }, { passive: false });

        function startDrag(x, y) {
            isDragging = true;
            state.isDraggingStreetView = true;
            pegman.classList.add('dragging');
            
            dropIndicator = document.createElement('div');
            dropIndicator.className = 'street-view-drop-indicator';
            dropIndicator.innerHTML = '<div class="drop-indicator-ring"></div><div class="drop-indicator-center"></div>';
            dropIndicator.style.display = 'none';
            document.body.appendChild(dropIndicator);

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        }

        function onMove(e) {
            if (!isDragging) return;
            updateDragPosition(e.clientX, e.clientY);
        }

        function onTouchMove(e) {
            if (!isDragging) return;
            e.preventDefault();
            const touch = e.touches[0];
            updateDragPosition(touch.clientX, touch.clientY);
        }

        function updateDragPosition(x, y) {
            pegman.style.position = 'fixed';
            pegman.style.left = (x - 22) + 'px';
            pegman.style.top = (y - 22) + 'px';
            pegman.style.right = 'auto';
            pegman.style.bottom = 'auto';

            const mapBounds = elements.map.getBoundingClientRect();
            const isOverMap = x >= mapBounds.left && x <= mapBounds.right && 
                              y >= mapBounds.top && y <= mapBounds.bottom;

            if (isOverMap) {
                dropIndicator.style.display = 'block';
                dropIndicator.style.left = x + 'px';
                dropIndicator.style.top = y + 'px';
                dropIndicator.style.marginLeft = '-30px';
                dropIndicator.style.marginTop = '-30px';
            } else {
                dropIndicator.style.display = 'none';
            }
        }

        function onEnd(e) {
            if (!isDragging) return;
            finishDrag(e.clientX, e.clientY);
        }

        function onTouchEnd(e) {
            if (!isDragging) return;
            const touch = e.changedTouches[0];
            finishDrag(touch.clientX, touch.clientY);
        }

        function finishDrag(x, y) {
            isDragging = false;
            state.isDraggingStreetView = false;
            pegman.classList.remove('dragging');

            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);

            if (dropIndicator && dropIndicator.parentNode) {
                dropIndicator.parentNode.removeChild(dropIndicator);
            }

            // Reset pegman position
            pegman.style.position = 'fixed';
            pegman.style.left = 'auto';
            pegman.style.top = 'auto';
            pegman.style.right = '70px';
            pegman.style.bottom = '100px';

            // Check if dropped on map
            const mapBounds = elements.map.getBoundingClientRect();
            const isOverMap = x >= mapBounds.left && x <= mapBounds.right && 
                              y >= mapBounds.top && y <= mapBounds.bottom;

            if (isOverMap) {
                const mapX = x - mapBounds.left;
                const mapY = y - mapBounds.top;
                const latlng = state.map.containerPointToLatLng([mapX, mapY]);

                console.log('📍 Street View at:', latlng.lat, latlng.lng);
                
                addStreetViewMarker(latlng.lat, latlng.lng);
                openStreetView(latlng.lat, latlng.lng);
            }
        }
    }

    function addStreetViewMarker(lat, lng) {
        if (state.streetViewMarker) {
            state.map.removeLayer(state.streetViewMarker);
        }

        const icon = L.divIcon({
            className: 'street-view-marker',
            html: '<div class="sv-marker-pulse"></div><div class="sv-marker-icon"><i class="fas fa-street-view"></i></div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        state.streetViewMarker = L.marker([lat, lng], { icon: icon })
            .addTo(state.map)
            .on('click', function() {
                openStreetView(lat, lng);
            });

        return state.streetViewMarker;
    }

    /* ============================================ */
    /* MAPILLARY STREET VIEW */
    /* ============================================ */
    async function openStreetView(lat, lng) {
        console.log('🛣️ Opening Street View at:', lat, lng);

        elements.streetViewLoading.classList.remove('hidden');
        elements.streetViewEmpty.classList.add('hidden');

        try {
            const imageData = await findMapillaryImage(lat, lng);

            if (!imageData) {
                console.log('❌ No Mapillary coverage');
                showErrorNotification('No street imagery available at this location');
                elements.streetViewLoading.classList.add('hidden');
                
                if (state.streetViewMarker) {
                    state.map.removeLayer(state.streetViewMarker);
                    state.streetViewMarker = null;
                }
                return;
            }

            console.log('✅ Found Mapillary image:', imageData.id);
            activateSplitScreen();
            await initMapillaryViewer(imageData.id);

            state.isStreetViewOpen = true;
            elements.streetViewBtn.classList.add('active');

        } catch (error) {
            console.error('Street View error:', error);
            elements.streetViewLoading.classList.add('hidden');
            showErrorNotification('Failed to load street imagery');
            
            if (state.streetViewMarker) {
                state.map.removeLayer(state.streetViewMarker);
                state.streetViewMarker = null;
            }
        }
    }

    async function findMapillaryImage(lat, lng) {
        const radiuses = [0.0005, 0.001, 0.002, 0.005, 0.01];

        for (let i = 0; i < radiuses.length; i++) {
            const r = radiuses[i];
            try {
                const bbox = (lng - r) + ',' + (lat - r) + ',' + (lng + r) + ',' + (lat + r);
                const url = 'https://graph.mapillary.com/images?access_token=' + 
                           CONFIG.mapillaryAccessToken + 
                           '&fields=id,geometry,captured_at&bbox=' + bbox + '&limit=1';

                const response = await fetchWithTimeout(url, {}, CONFIG.mapillaryTimeoutMs);
                const data = await response.json();

                if (data.data && data.data.length > 0) {
                    return {
                        id: data.data[0].id,
                        lat: data.data[0].geometry.coordinates[1],
                        lng: data.data[0].geometry.coordinates[0],
                        capturedAt: data.data[0].captured_at
                    };
                }
            } catch (error) {
                console.warn('Mapillary search failed at radius ' + r);
            }
        }

        return null;
    }

    async function initMapillaryViewer(imageId) {
        return new Promise(function(resolve, reject) {
            try {
                if (typeof mapillary === 'undefined') {
                    throw new Error('Mapillary JS not loaded');
                }

                if (!state.mapillaryViewer) {
                    state.mapillaryViewer = new mapillary.Viewer({
                        accessToken: CONFIG.mapillaryAccessToken,
                        container: elements.mapillaryViewer,
                        imageId: imageId,
                        component: {
                            cover: false
                        }
                    });

                    state.mapillaryViewer.on('load', function() {
                        elements.streetViewLoading.classList.add('hidden');
                        resolve();
                    });

                    state.mapillaryViewer.on('image', function(event) {
                        if (event.image) {
                            const date = event.image.capturedAt 
                                ? new Date(event.image.capturedAt).toLocaleDateString() 
                                : 'Unknown';
                            elements.streetViewLocation.textContent = 'Captured: ' + date;
                        }
                    });

                    state.mapillaryViewer.on('error', function(error) {
                        console.error('Mapillary error:', error);
                        elements.streetViewLoading.classList.add('hidden');
                        reject(error);
                    });
                } else {
                    state.mapillaryViewer.moveTo(imageId)
                        .then(function() {
                            elements.streetViewLoading.classList.add('hidden');
                            resolve();
                        })
                        .catch(reject);
                }

                setTimeout(function() {
                    elements.streetViewLoading.classList.add('hidden');
                    resolve();
                }, 5000);

            } catch (error) {
                reject(error);
            }
        });
    }

    function activateSplitScreen() {
        elements.mapPanel.classList.add('split');
        elements.streetViewPanel.classList.remove('hidden');
        elements.resizeHandle.classList.remove('hidden');
        state.isStreetViewOpen = true;

        setTimeout(function() {
            state.map.invalidateSize();
        }, 350);
    }

    function closeStreetView() {
        elements.mapPanel.classList.remove('split');
        elements.streetViewPanel.classList.add('hidden');
        elements.resizeHandle.classList.add('hidden');
        elements.streetViewLoading.classList.add('hidden');
        elements.streetViewBtn.classList.remove('active');
        state.isStreetViewOpen = false;

        if (state.streetViewMarker) {
            state.map.removeLayer(state.streetViewMarker);
            state.streetViewMarker = null;
        }

        setTimeout(function() {
            state.map.invalidateSize();
        }, 350);
    }

    /* ============================================ */
    /* TILE LAYERS */
    /* ============================================ */
    async function setMapLayer(layerName) {
        const provider = TILE_PROVIDERS[layerName];
        if (!provider) {
            console.error('Unknown layer:', layerName);
            return false;
        }

        if (state.currentBaseLayer) {
            state.map.removeLayer(state.currentBaseLayer);
        }
        
        state.currentOverlays.forEach(function(layer) {
            if (state.map.hasLayer(layer)) {
                state.map.removeLayer(layer);
            }
        });
        state.currentOverlays = [];

        let baseLayerSet = false;
        for (let i = 0; i < provider.layers.length; i++) {
            const layerConfig = provider.layers[i];
            try {
                const tileLayer = await createTileLayer(layerConfig);
                if (tileLayer) {
                    state.currentBaseLayer = tileLayer;
                    tileLayer.addTo(state.map);
                    console.log('✅ Base layer:', layerConfig.name);
                    baseLayerSet = true;
                    break;
                }
            } catch (error) {
                console.warn('Layer failed:', layerConfig.name);
            }
        }

        if (!baseLayerSet) {
            state.currentBaseLayer = L.tileLayer(
                'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                { maxZoom: 19 }
            ).addTo(state.map);
        }

        if (provider.overlays) {
            for (let i = 0; i < provider.overlays.length; i++) {
                const overlayConfig = provider.overlays[i];
                try {
                    const overlay = L.tileLayer(overlayConfig.url, {
                        maxZoom: overlayConfig.maxZoom || 20,
                        subdomains: overlayConfig.subdomains || 'abc',
                        opacity: 0.9
                    });
                    overlay.addTo(state.map);
                    state.currentOverlays.push(overlay);
                } catch (error) {
                    console.warn('Overlay failed');
                }
            }
        }

        state.currentLayer = layerName;
        saveStorage(CONFIG.storageKeys.layer, layerName);
        updateLayerUI();

        return true;
    }

    function createTileLayer(config) {
        return new Promise(function(resolve) {
            const layer = L.tileLayer(config.url, {
                attribution: config.attribution || '',
                maxZoom: config.maxZoom || 20,
                maxNativeZoom: config.maxNativeZoom || config.maxZoom || 19,
                subdomains: config.subdomains || 'abc',
                errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                crossOrigin: true
            });
            setTimeout(function() { resolve(layer); }, 300);
        });
    }

    function updateLayerUI() {
        elements.layerOptions.forEach(function(option) {
            const isActive = option.dataset.layer === state.currentLayer;
            option.classList.toggle('active', isActive);
        });

        const names = { streets: 'Streets', satellite: 'Satellite', dark: 'Dark', hybrid: 'Hybrid' };
        elements.currentLayerDisplay.textContent = names[state.currentLayer] || 'Streets';
    }

    function updateOverlayToggles() {
        if (elements.toggleLabels) elements.toggleLabels.checked = state.overlays.labels;
        if (elements.toggleHouseNumbers) elements.toggleHouseNumbers.checked = state.overlays.houseNumbers;
        if (elements.toggleBuildings) elements.toggleBuildings.checked = state.overlays.buildings;
    }

    /* ============================================ */
    /* MAP EVENTS */
    /* ============================================ */
    function setupMapEvents() {
        state.map.on('mousemove', function(e) {
            elements.cursorCoords.textContent = e.latlng.lat.toFixed(5) + ', ' + e.latlng.lng.toFixed(5);
        });

        state.map.on('zoomend', function() {
            elements.zoomLevel.textContent = state.map.getZoom();
            checkMaxZoom();
        });

        state.map.on('zoomstart', function() {
            elements.maxZoomWarning.classList.add('hidden');
        });

        state.map.on('click', function() {
            hideSearchDropdown();
            hideLayerPanel();
        });

        elements.zoomLevel.textContent = state.map.getZoom();
    }

    function checkMaxZoom() {
        const currentZoom = state.map.getZoom();
        const provider = TILE_PROVIDERS[state.currentLayer];
        if (!provider) return;

        const maxNative = provider.layers[0].maxNativeZoom || 19;
        
        if (currentZoom > maxNative) {
            elements.maxZoomWarning.classList.remove('hidden');
            setTimeout(function() {
                elements.maxZoomWarning.classList.add('hidden');
            }, 3000);
        } else {
            elements.maxZoomWarning.classList.add('hidden');
        }

        if (currentZoom > maxNative + 2) {
            state.map.setZoom(maxNative + 2);
        }
    }

    /* ============================================ */
    /* LOCATION BIAS */
    /* ============================================ */
    async function initializeLocationBias() {
        state.biasLocation = {
            lat: CONFIG.home.lat,
            lng: CONFIG.home.lng
        };

        try {
            const position = await getCurrentPosition(5000);
            state.userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            state.biasLocation = state.userLocation;
        } catch (error) {
            console.log('Using home for bias');
        }
    }

    function getCurrentPosition(timeout) {
        return new Promise(function(resolve, reject) {
            if (!navigator.geolocation) {
                reject(new Error('No geolocation'));
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: timeout || 10000,
                maximumAge: 300000
            });
        });
    }

    /* ============================================ */
    /* GEOCODING */
    /* ============================================ */
    async function searchAddress(query) {
        if (!query || query.trim().length < 2) {
            hideSearchDropdown();
            return [];
        }

        query = query.trim();
        state.lastQuery = query;
        state.isSearching = true;

        if (state.abortController) {
            state.abortController.abort();
        }
        state.abortController = new AbortController();

        showSearchLoading();

        let results = [];

        for (let i = 0; i < GEOCODE_PROVIDERS.length; i++) {
            const provider = GEOCODE_PROVIDERS[i];
            if (state.providerFailures[provider.name] >= 3) continue;

            try {
                results = await geocodeWithProvider(provider, query);
                if (results && results.length > 0) {
                    state.providerFailures[provider.name] = 0;
                    state.currentProvider = provider.name;
                    updateProviderStatus(provider.name);
                    break;
                }
            } catch (error) {
                state.providerFailures[provider.name] = (state.providerFailures[provider.name] || 0) + 1;
            }
        }

        state.isSearching = false;

        if (results.length > 0) {
            results = sortResultsByDistance(results);
            displaySearchResults(results);
        } else {
            showSearchError();
        }

        return results;
    }

    async function geocodeWithProvider(provider, query) {
        const signal = state.abortController.signal;

        if (provider.type === 'photon') {
            return await geocodePhoton(provider.url, query, signal);
        } else if (provider.type === 'nominatim') {
            return await geocodeNominatim(provider.url, query, signal);
        } else if (provider.type === 'arcgis') {
            return await geocodeArcGIS(provider.url, query, signal);
        }
        return [];
    }

    async function geocodePhoton(baseUrl, query, signal) {
        let url = baseUrl + '?q=' + encodeURIComponent(query) + '&limit=' + CONFIG.maxSearchResults;
        if (state.biasLocation) {
            url += '&lat=' + state.biasLocation.lat + '&lon=' + state.biasLocation.lng;
        }

        const response = await fetchWithTimeout(url, { signal: signal });
        const data = await response.json();

        if (!data.features || !data.features.length) return [];

        return data.features.map(function(f) {
            const p = f.properties;
            let name = p.name || p.street || p.city || 'Unknown';
            if (p.housenumber && p.street) {
                name = p.housenumber + ' ' + p.street;
            }

            const parts = [];
            if (p.street) parts.push(p.street);
            if (p.city) parts.push(p.city);
            if (p.state) parts.push(p.state);

            return {
                id: generateId(),
                lat: f.geometry.coordinates[1],
                lng: f.geometry.coordinates[0],
                name: name,
                displayName: parts.join(', ') || name,
                type: p.osm_value || 'place',
                provider: 'Photon'
            };
        });
    }

    async function geocodeNominatim(baseUrl, query, signal) {
        let url = baseUrl + '?q=' + encodeURIComponent(query) + '&format=json&limit=' + CONFIG.maxSearchResults;
        
        if (state.biasLocation) {
            const offset = CONFIG.biasRadiusKm / 111;
            const lngOffset = offset / Math.cos(state.biasLocation.lat * Math.PI / 180);
            const viewbox = [
                state.biasLocation.lng - lngOffset,
                state.biasLocation.lat + offset,
                state.biasLocation.lng + lngOffset,
                state.biasLocation.lat - offset
            ].join(',');
            url += '&viewbox=' + viewbox + '&bounded=0';
        }

        const response = await fetchWithTimeout(url, { signal: signal });
        const data = await response.json();

        if (!Array.isArray(data) || !data.length) return [];

        return data.map(function(item) {
            return {
                id: generateId(),
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                name: item.display_name.split(',')[0],
                displayName: item.display_name,
                type: item.type || 'place',
                provider: 'Nominatim'
            };
        });
    }

    async function geocodeArcGIS(baseUrl, query, signal) {
        let url = baseUrl + '?f=json&singleLine=' + encodeURIComponent(query) + '&maxLocations=' + CONFIG.maxSearchResults;
        
        if (state.biasLocation) {
            url += '&location=' + state.biasLocation.lng + ',' + state.biasLocation.lat;
            url += '&distance=' + Math.round(CONFIG.biasRadiusMiles * 1609.34);
        }

        const response = await fetchWithTimeout(url, { signal: signal });
        const data = await response.json();

        if (!data.candidates || !data.candidates.length) return [];

        return data.candidates.map(function(c) {
            return {
                id: generateId(),
                lat: c.location.y,
                lng: c.location.x,
                name: c.address.split(',')[0],
                displayName: c.address,
                type: 'address',
                provider: 'ArcGIS'
            };
        });
    }

    async function reverseGeocode(lat, lng) {
        for (let i = 0; i < REVERSE_GEOCODE_PROVIDERS.length; i++) {
            const provider = REVERSE_GEOCODE_PROVIDERS[i];
            try {
                let url, response, data;

                if (provider.type === 'nominatim') {
                    url = provider.url + '?lat=' + lat + '&lon=' + lng + '&format=json';
                    response = await fetchWithTimeout(url);
                    data = await response.json();
                    if (data && data.display_name) {
                        return {
                            name: data.display_name.split(',')[0],
                            displayName: data.display_name,
                            lat: lat,
                            lng: lng
                        };
                    }
                } else if (provider.type === 'arcgis') {
                    url = provider.url + '?location=' + lng + ',' + lat + '&f=json';
                    response = await fetchWithTimeout(url);
                    data = await response.json();
                    if (data && data.address) {
                        return {
                            name: data.address.Address || data.address.Match_addr,
                            displayName: data.address.Match_addr,
                            lat: lat,
                            lng: lng
                        };
                    }
                }
            } catch (error) {
                console.warn('Reverse geocode failed');
            }
        }

        return {
            name: 'Unknown',
            displayName: lat.toFixed(5) + ', ' + lng.toFixed(5),
            lat: lat,
            lng: lng
        };
    }

    async function fetchWithTimeout(url, options, timeout) {
        options = options || {};
        timeout = timeout || CONFIG.requestTimeoutMs;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(function() { controller.abort(); }, timeout);

        try {
            const response = await fetch(url, {
                signal: options.signal || controller.signal
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    function sortResultsByDistance(results) {
        if (!state.biasLocation) return results;

        return results.map(function(r) {
            r.distance = calculateDistance(
                state.biasLocation.lat, state.biasLocation.lng,
                r.lat, r.lng
            );
            return r;
        }).sort(function(a, b) {
            const aLocal = a.distance <= CONFIG.biasRadiusMiles;
            const bLocal = b.distance <= CONFIG.biasRadiusMiles;
            if (aLocal && !bLocal) return -1;
            if (!aLocal && bLocal) return 1;
            return a.distance - b.distance;
        });
    }

    function updateProviderStatus(name) {
        const el = elements.providerStatus;
        if (el) {
            const span = el.querySelector('span');
            if (span) span.textContent = name;
        }
    }

    /* ============================================ */
    /* SEARCH UI */
    /* ============================================ */
    function displaySearchResults(results) {
        elements.searchLoading.classList.add('hidden');
        elements.searchError.classList.add('hidden');
        elements.searchDropdown.classList.remove('hidden');
        elements.resultCount.textContent = results.length + ' found';
        elements.searchResults.innerHTML = '';

        results.forEach(function(result, index) {
            const li = document.createElement('li');
            li.className = 'search-result-item';
            li.dataset.index = index;

            const distance = result.distance ? formatDistance(result.distance) : '';
            const isLocal = result.distance && result.distance <= CONFIG.biasRadiusMiles;

            li.innerHTML = 
                '<span class="result-icon"><i class="fas fa-map-marker-alt"></i></span>' +
                '<div class="result-content">' +
                '  <div class="result-title">' + escapeHtml(result.name) + '</div>' +
                '  <div class="result-subtitle">' + escapeHtml(result.displayName) + '</div>' +
                '</div>' +
                (distance ? '<span class="result-distance' + (isLocal ? ' local' : '') + '">' + distance + '</span>' : '');

            li.addEventListener('click', function() {
                selectSearchResult(result);
            });

            li.addEventListener('mouseenter', function() {
                setActiveResult(index);
            });

            elements.searchResults.appendChild(li);
        });

        state.searchResults = results;
        state.activeResultIndex = -1;
    }

    function setActiveResult(index) {
        const items = elements.searchResults.querySelectorAll('.search-result-item');
        items.forEach(function(item, i) {
            item.classList.toggle('active', i === index);
        });
        state.activeResultIndex = index;
    }

    function showSearchLoading() {
        elements.searchDropdown.classList.remove('hidden');
        elements.searchLoading.classList.remove('hidden');
        elements.searchError.classList.add('hidden');
        elements.searchResults.innerHTML = '';
        elements.resultCount.textContent = 'Searching...';
    }

    function showSearchError() {
        elements.searchLoading.classList.add('hidden');
        elements.searchError.classList.remove('hidden');
        elements.resultCount.textContent = '0 found';
    }

    function hideSearchDropdown() {
        elements.searchDropdown.classList.add('hidden');
        state.activeResultIndex = -1;
    }

    /* ============================================ */
    /* SELECT RESULT */
    /* ============================================ */
    function selectSearchResult(result) {
        hideSearchDropdown();
        elements.searchInput.value = result.name;

        addTacticalMarker(result.lat, result.lng);
        flyToLocation(result.lat, result.lng, CONFIG.defaultZoom);

        state.currentLocation = result;
        addToHistory(result);
        showLocationCard(result);

        showToast('Located: ' + result.name, 'success', 2000);
    }

    function flyToLocation(lat, lng, zoom) {
        zoom = zoom || CONFIG.defaultZoom;
        const provider = TILE_PROVIDERS[state.currentLayer];
        const maxNative = provider && provider.layers[0] ? provider.layers[0].maxNativeZoom : 19;
        const safeZoom = Math.min(zoom, maxNative + 1);

        state.map.flyTo([lat, lng], safeZoom, {
            duration: CONFIG.flyToDuration
        });
    }

    function addTacticalMarker(lat, lng) {
        if (state.currentMarker) {
            state.map.removeLayer(state.currentMarker);
        }

        const icon = L.divIcon({
            className: 'tactical-marker',
            html: '<div class="marker-pulse"></div><div class="marker-dot"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        state.currentMarker = L.marker([lat, lng], { icon: icon }).addTo(state.map);
        return state.currentMarker;
    }

    /* ============================================ */
    /* LOCATION CARD */
    /* ============================================ */
    function showLocationCard(location) {
        elements.locationTitle.textContent = location.name || 'Location';
        elements.locationAddress.textContent = location.displayName || '';
        elements.locationLat.textContent = location.lat.toFixed(6);
        elements.locationLng.textContent = location.lng.toFixed(6);
        elements.locationType.textContent = (location.type || 'LOCATION').toUpperCase();
        elements.locationDistance.textContent = location.distance ? formatDistance(location.distance) : '--';
        elements.locationCard.classList.remove('hidden');
    }

    function hideLocationCard() {
        elements.locationCard.classList.add('hidden');
    }

    /* ============================================ */
    /* SEARCH HISTORY */
    /* ============================================ */
    function loadSearchHistory() {
        state.searchHistory = loadStorage(CONFIG.storageKeys.history, []);
        renderHistoryList();
        updateHistoryBadge();
    }

    function addToHistory(result) {
        const item = {
            id: generateId(),
            name: result.name,
            displayName: result.displayName,
            lat: result.lat,
            lng: result.lng,
            timestamp: Date.now()
        };

        state.searchHistory = state.searchHistory.filter(function(h) {
            return Math.abs(h.lat - result.lat) > 0.0001 || Math.abs(h.lng - result.lng) > 0.0001;
        });

        state.searchHistory.unshift(item);

        if (state.searchHistory.length > CONFIG.maxHistoryItems) {
            state.searchHistory = state.searchHistory.slice(0, CONFIG.maxHistoryItems);
        }

        saveStorage(CONFIG.storageKeys.history, state.searchHistory);
        renderHistoryList();
        updateHistoryBadge();
    }

    function renderHistoryList() {
        if (!state.searchHistory.length) {
            elements.historyList.innerHTML = '';
            if (elements.historyEmpty) elements.historyEmpty.classList.remove('hidden');
            return;
        }

        if (elements.historyEmpty) elements.historyEmpty.classList.add('hidden');
        
        elements.historyList.innerHTML = state.searchHistory.map(function(item) {
            return '<li class="history-item" data-id="' + item.id + '">' +
                '<span class="history-item-icon"><i class="fas fa-map-marker-alt"></i></span>' +
                '<div class="history-item-content">' +
                '  <div class="history-item-title">' + escapeHtml(item.name) + '</div>' +
                '  <div class="history-item-time">' + formatTimeAgo(item.timestamp) + '</div>' +
                '</div>' +
                '<button class="history-item-delete" data-id="' + item.id + '">' +
                '  <i class="fas fa-times"></i>' +
                '</button>' +
                '</li>';
        }).join('');

        elements.historyList.querySelectorAll('.history-item').forEach(function(el) {
            el.addEventListener('click', function(e) {
                if (!e.target.closest('.history-item-delete')) {
                    const item = state.searchHistory.find(function(h) { return h.id === el.dataset.id; });
                    if (item) selectSearchResult(item);
                }
            });
        });

        elements.historyList.querySelectorAll('.history-item-delete').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                removeFromHistory(btn.dataset.id);
            });
        });
    }

    function removeFromHistory(id) {
        state.searchHistory = state.searchHistory.filter(function(h) { return h.id !== id; });
        saveStorage(CONFIG.storageKeys.history, state.searchHistory);
        renderHistoryList();
        updateHistoryBadge();
    }

    function clearAllHistory() {
        state.searchHistory = [];
        saveStorage(CONFIG.storageKeys.history, []);
        renderHistoryList();
        updateHistoryBadge();
        showToast('History cleared', 'info', 2000);
    }

    function updateHistoryBadge() {
        const count = state.searchHistory.length;
        if (elements.historyCount) {
            elements.historyCount.textContent = count;
            elements.historyCount.classList.toggle('visible', count > 0);
        }
    }

    /* ============================================ */
    /* EVENT LISTENERS */
    /* ============================================ */
    function setupEventListeners() {
        const debouncedSearch = debounce(searchAddress, CONFIG.searchDebounceMs);

        elements.searchInput.addEventListener('input', function(e) {
            const query = e.target.value;
            if (elements.clearSearch) {
                elements.clearSearch.classList.toggle('hidden', !query);
            }
            if (query.length >= 2) {
                debouncedSearch(query);
            } else {
                hideSearchDropdown();
            }
        });

        elements.searchInput.addEventListener('keydown', function(e) {
            handleSearchKeydown(e);
        });

        elements.searchInput.addEventListener('focus', function() {
            if (elements.searchInput.value.length >= 2 && state.searchResults && state.searchResults.length) {
                elements.searchDropdown.classList.remove('hidden');
            }
        });

        elements.searchBtn.addEventListener('click', function() {
            if (elements.searchInput.value.length >= 2) {
                searchAddress(elements.searchInput.value);
            }
        });

        if (elements.clearSearch) {
            elements.clearSearch.addEventListener('click', function() {
                elements.searchInput.value = '';
                elements.clearSearch.classList.add('hidden');
                hideSearchDropdown();
                elements.searchInput.focus();
            });
        }

        elements.myLocationBtn.addEventListener('click', goToMyLocation);
        
        elements.streetViewBtn.addEventListener('click', function() {
            if (state.isStreetViewOpen) {
                closeStreetView();
            } else if (state.currentLocation) {
                addStreetViewMarker(state.currentLocation.lat, state.currentLocation.lng);
                openStreetView(state.currentLocation.lat, state.currentLocation.lng);
            } else {
                showToast('Drag the red icon to a street', 'info', 3000);
            }
        });

        elements.zoomIn.addEventListener('click', function() { state.map.zoomIn(); });
        elements.zoomOut.addEventListener('click', function() { state.map.zoomOut(); });
        elements.homeBtn.addEventListener('click', goToHome);
        elements.rotateBtn.addEventListener('click', function() { showToast('Rotation reset', 'info', 2000); });
        elements.layerBtn.addEventListener('click', toggleLayerPanel);

        if (elements.closeLayerPanel) {
            elements.closeLayerPanel.addEventListener('click', hideLayerPanel);
        }

        elements.layerOptions.forEach(function(option) {
            option.addEventListener('click', function() {
                setMapLayer(option.dataset.layer);
                hideLayerPanel();
            });
        });

        if (elements.toggleLabels) {
            elements.toggleLabels.addEventListener('change', function(e) {
                state.overlays.labels = e.target.checked;
                saveStorage(CONFIG.storageKeys.overlays, state.overlays);
            });
        }

        if (elements.toggleHouseNumbers) {
            elements.toggleHouseNumbers.addEventListener('change', function(e) {
                state.overlays.houseNumbers = e.target.checked;
                saveStorage(CONFIG.storageKeys.overlays, state.overlays);
            });
        }

        if (elements.toggleBuildings) {
            elements.toggleBuildings.addEventListener('change', function(e) {
                state.overlays.buildings = e.target.checked;
                saveStorage(CONFIG.storageKeys.overlays, state.overlays);
            });
        }

        if (elements.historyToggle) {
            elements.historyToggle.addEventListener('click', function() {
                elements.historySidebar.classList.toggle('collapsed');
            });
        }

        if (elements.clearHistory) {
            elements.clearHistory.addEventListener('click', clearAllHistory);
        }

        if (elements.closeLocationCard) {
            elements.closeLocationCard.addEventListener('click', hideLocationCard);
        }
        
        if (elements.copyCoords) {
            elements.copyCoords.addEventListener('click', copyCoordinates);
        }
        
        if (elements.openStreetViewCard) {
            elements.openStreetViewCard.addEventListener('click', function() {
                if (state.currentLocation) {
                    addStreetViewMarker(state.currentLocation.lat, state.currentLocation.lng);
                    openStreetView(state.currentLocation.lat, state.currentLocation.lng);
                }
            });
        }
        
        if (elements.openGoogleMaps) {
            elements.openGoogleMaps.addEventListener('click', openInGoogleMaps);
        }
        
        if (elements.maxZoomBtn) {
            elements.maxZoomBtn.addEventListener('click', zoomToMax);
        }

        if (elements.closeStreetView) {
            elements.closeStreetView.addEventListener('click', closeStreetView);
        }

        if (elements.closeShortcuts) {
            elements.closeShortcuts.addEventListener('click', function() {
                elements.shortcutsModal.classList.add('hidden');
            });
        }

        document.addEventListener('click', function(e) {
            if (!e.target.closest('.search-wrapper')) {
                hideSearchDropdown();
            }
            if (!e.target.closest('.layer-panel') && !e.target.closest('#layerBtn')) {
                hideLayerPanel();
            }
        });

        document.addEventListener('keydown', handleGlobalKeydown);
    }

    function handleSearchKeydown(e) {
        const items = elements.searchResults.querySelectorAll('.search-result-item');
        const count = items.length;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (state.activeResultIndex < count - 1) {
                setActiveResult(state.activeResultIndex + 1);
                if (items[state.activeResultIndex]) {
                    items[state.activeResultIndex].scrollIntoView({ block: 'nearest' });
                }
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (state.activeResultIndex > 0) {
                setActiveResult(state.activeResultIndex - 1);
                if (items[state.activeResultIndex]) {
                    items[state.activeResultIndex].scrollIntoView({ block: 'nearest' });
                }
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (state.activeResultIndex >= 0 && state.searchResults && state.searchResults[state.activeResultIndex]) {
                selectSearchResult(state.searchResults[state.activeResultIndex]);
            } else if (elements.searchInput.value.length >= 2) {
                searchAddress(elements.searchInput.value);
            }
        } else if (e.key === 'Escape') {
            hideSearchDropdown();
            elements.searchInput.blur();
        }
    }

    function handleGlobalKeydown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === '/' || e.key === 's' || e.key === 'S') {
            e.preventDefault();
            elements.searchInput.focus();
        } else if (e.key === 'Escape') {
            hideLocationCard();
            hideSearchDropdown();
            hideLayerPanel();
            closeStreetView();
            if (elements.shortcutsModal) elements.shortcutsModal.classList.add('hidden');
        } else if (e.key === '1') {
            setMapLayer('streets');
        } else if (e.key === '2') {
            setMapLayer('satellite');
        } else if (e.key === '3') {
            setMapLayer('dark');
        } else if (e.key === '4') {
            setMapLayer('hybrid');
        } else if (e.key === 'h' || e.key === 'H') {
            goToHome();
        } else if (e.key === 'l' || e.key === 'L') {
            goToMyLocation();
        } else if (e.key === 'v' || e.key === 'V') {
            if (state.currentLocation) {
                addStreetViewMarker(state.currentLocation.lat, state.currentLocation.lng);
                openStreetView(state.currentLocation.lat, state.currentLocation.lng);
            }
        } else if (e.key === 'm' || e.key === 'M') {
            toggleLayerPanel();
        } else if (e.key === '+' || e.key === '=') {
            state.map.zoomIn();
        } else if (e.key === '-') {
            state.map.zoomOut();
        } else if (e.key === '?') {
            if (elements.shortcutsModal) elements.shortcutsModal.classList.toggle('hidden');
        }
    }

    /* ============================================ */
    /* ACTIONS */
    /* ============================================ */
    async function goToMyLocation() {
        try {
            showToast('Getting location...', 'info', 2000);

            const position = await getCurrentPosition(10000);
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            state.userLocation = { lat: lat, lng: lng };
            const location = await reverseGeocode(lat, lng);

            addTacticalMarker(lat, lng);
            flyToLocation(lat, lng, 17);
            state.currentLocation = { lat: lat, lng: lng, name: location.name, displayName: location.displayName };
            showLocationCard(state.currentLocation);

            showToast('Location found', 'success', 2000);
        } catch (error) {
            showToast('Could not get location', 'error', 3000);
        }
    }

    function goToHome() {
        state.map.flyTo([CONFIG.home.lat, CONFIG.home.lng], CONFIG.home.zoom, {
            duration: 1
        });
        showToast('Home: ' + CONFIG.home.name, 'info', 2000);
    }

    function toggleLayerPanel() {
        elements.layerPanel.classList.toggle('hidden');
        elements.layerBtn.classList.toggle('active');
    }

    function hideLayerPanel() {
        elements.layerPanel.classList.add('hidden');
        elements.layerBtn.classList.remove('active');
    }

    async function copyCoordinates() {
        if (!state.currentLocation) return;

        const coords = state.currentLocation.lat.toFixed(6) + ', ' + state.currentLocation.lng.toFixed(6);

        try {
            await navigator.clipboard.writeText(coords);
            showToast('Coordinates copied', 'success', 2000);
        } catch (error) {
            const textarea = document.createElement('textarea');
            textarea.value = coords;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('Coordinates copied', 'success', 2000);
        }
    }

    function openInGoogleMaps() {
        if (!state.currentLocation) return;
        const url = 'https://www.google.com/maps?q=' + state.currentLocation.lat + ',' + state.currentLocation.lng;
        window.open(url, '_blank');
    }

    function zoomToMax() {
        if (!state.currentLocation) return;
        const provider = TILE_PROVIDERS[state.currentLayer];
        const maxNative = provider && provider.layers[0] ? provider.layers[0].maxNativeZoom : 19;
        flyToLocation(state.currentLocation.lat, state.currentLocation.lng, maxNative);
    }

    /* ============================================ */
    /* INIT */
    /* ============================================ */
    async function init() {
        console.log('🚀 Tactical Command Map starting...');

        try {
            cacheElements();
            await initializeMap();
            setupEventListeners();

            console.log('✅ Tactical Command Map ready');
        } catch (error) {
            console.error('❌ Init failed:', error);
            showToast('Failed to initialize. Refresh page.', 'error', 0);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();