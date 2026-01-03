/* ============================================ */
/* TACTICAL COMMAND MAP - MAIN APPLICATION */
/* ============================================ */

(function() {
    'use strict';

    /* ============================================ */
    /* CONFIGURATION */
    /* ============================================ */
    const CONFIG = {
        // === HOME LOCATION (Change to your area) ===
        home: {
            lat: 34.0522,
            lng: -118.2437,
            zoom: 12,
            name: "Los Angeles, CA"
        },

        // === LOCATION BIASING ===
        biasRadiusMiles: 75,
        biasRadiusKm: 120.7,

        // === SEARCH SETTINGS ===
        searchDebounceMs: 350,
        maxSearchResults: 10,
        maxHistoryItems: 10,

        // === MAP SETTINGS ===
        flyToDuration: 1.5,
        defaultZoom: 18,
        maxZoom: 19,
        minZoom: 3,

        // === TIMEOUT SETTINGS ===
        requestTimeoutMs: 8000,
        mapillaryTimeoutMs: 5000,

        // === MAPILLARY API ===
        // FREE API KEY REQUIRED - Get yours at:
        // https://www.mapillary.com/developer/api-documentation
        // 1. Create free account
        // 2. Go to Dashboard > Developers
        // 3. Create new application
        // 4. Copy the Client Token (starts with MLY|)
        mapillaryAccessToken:accessToken: 'MLY|7096961157099603|7fb2ed4b52bc77827ab9451bf2ec3d8c',

        // === LOCAL STORAGE KEYS ===
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
                },
                {
                    name: 'CartoDB Positron',
                    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                    attribution: '© CARTO',
                    maxZoom: 20,
                    maxNativeZoom: 20,
                    subdomains: 'abcd'
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
                },
                {
                    name: 'USGS Imagery',
                    url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
                    attribution: '© USGS',
                    maxZoom: 16,
                    maxNativeZoom: 16
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
                },
                {
                    name: 'Stadia Alidade Dark',
                    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
                    attribution: '© Stadia Maps',
                    maxZoom: 20,
                    maxNativeZoom: 20
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
    /* GEOCODING PROVIDERS WITH FALLBACKS */
    /* ============================================ */
    const GEOCODE_PROVIDERS = [
        {
            name: 'Photon',
            type: 'photon',
            url: 'https://photon.komoot.io/api/',
            priority: 1
        },
        {
            name: 'Nominatim OSM',
            type: 'nominatim',
            url: 'https://nominatim.openstreetmap.org/search',
            priority: 2
        },
        {
            name: 'Nominatim Alt',
            type: 'nominatim',
            url: 'https://nominatim.geocoding.ai/search',
            priority: 3
        },
        {
            name: 'ArcGIS',
            type: 'arcgis',
            url: 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates',
            priority: 4
        }
    ];

    const REVERSE_GEOCODE_PROVIDERS = [
        {
            name: 'Nominatim',
            type: 'nominatim',
            url: 'https://nominatim.openstreetmap.org/reverse'
        },
        {
            name: 'Photon',
            type: 'photon',
            url: 'https://photon.komoot.io/reverse'
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
        
        // Markers
        currentMarker: null,
        currentLocation: null,
        
        // Street View Pegman
        streetViewMarker: null,
        streetViewIcon: null,
        isDraggingStreetView: false,
        streetViewDropLocation: null,
        
        // Mapillary
        mapillaryViewer: null,
        isStreetViewOpen: false,
        
        // Search
        searchHistory: [],
        searchResults: [],
        isSearching: false,
        abortController: null,
        activeResultIndex: -1,
        lastQuery: '',
        
        // Location
        userLocation: null,
        biasLocation: null,
        
        // Provider tracking
        providerFailures: {},
        currentProvider: 'Photon',
        
        // Overlays state
        overlays: {
            labels: true,
            houseNumbers: true,
            buildings: false
        },
        
        // UI state
        maxZoomReached: false
    };

    /* ============================================ */
    /* DOM ELEMENTS CACHE */
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

    function calculateDistance(lat1, lon1, lat2, lon2, unit = 'miles') {
        const R = unit === 'miles' ? 3959 : 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function toRad(deg) {
        return deg * (Math.PI / 180);
    }

    function formatDistance(miles) {
        if (miles < 0.1) return `${Math.round(miles * 5280)} ft`;
        if (miles < 10) return `${miles.toFixed(1)} mi`;
        return `${Math.round(miles)} mi`;
    }

    function formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    function generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
            console.warn('Storage save failed:', e);
            return false;
        }
    }

    function loadStorage(key, fallback = null) {
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

    function showToast(message, type = 'info', duration = 4000) {
        const icons = {
            success: 'check',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon"><i class="fas fa-${icons[type]}"></i></span>
            <span class="toast-message">${escapeHtml(message)}</span>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;

        elements.toastContainer.appendChild(toast);

        toast.querySelector('.toast-close').addEventListener('click', () => {
            removeToast(toast);
        });

        if (duration > 0) {
            setTimeout(() => removeToast(toast), duration);
        }

        return toast;
    }

    function removeToast(toast) {
        if (!toast?.parentNode) return;
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }

    function showErrorNotification(message = 'No street imagery available at this location') {
        elements.errorMessage.textContent = message;
        elements.errorNotification.classList.remove('hidden');
        
        setTimeout(() => {
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
            minZoom: CONFIG.minZoom,
            maxBoundsViscosity: 1.0
        });

        updateLoadingProgress(30);

        const savedLayer = loadStorage(CONFIG.storageKeys.layer, 'streets');
        state.currentLayer = savedLayer;

        const savedOverlays = loadStorage(CONFIG.storageKeys.overlays);
        if (savedOverlays) {
            state.overlays = { ...state.overlays, ...savedOverlays };
        }

        await setMapLayer(state.currentLayer);
        updateLoadingProgress(60);

        setupMapEvents();
        updateLoadingProgress(70);

        // Initialize Street View Pegman (draggable icon)
        initializeStreetViewPegman();
        updateLoadingProgress(80);

        await initializeLocationBias();
        updateLoadingProgress(90);

        loadSearchHistory();

        updateLayerUI();
        updateOverlayToggles();

        updateLoadingProgress(100);

        setTimeout(() => {
            elements.loadingOverlay.classList.add('hidden');
            showToast('Map ready. Drag the red icon to view streets.', 'success', 4000);
        }, 500);

        console.log('✅ Tactical Map initialized');
    }

    function updateLoadingProgress(percent) {
        if (elements.loadingBar) {
            elements.loadingBar.style.width = `${percent}%`;
            elements.loadingBar.style.animation = 'none';
        }
    }

    /* ============================================ */
    /* STREET VIEW PEGMAN - DRAGGABLE ICON */
    /* ============================================ */

    function initializeStreetViewPegman() {
        // Create the draggable Street View icon (like Google's Pegman)
        const pegmanIcon = L.divIcon({
            className: 'street-view-pegman',
            html: `
                <div class="pegman-container" id="pegmanIcon">
                    <div class="pegman-icon">
                        <i class="fas fa-street-view"></i>
                    </div>
                    <div class="pegman-pulse"></div>
                    <div class="pegman-tooltip">Drag to street</div>
                </div>
            `,
            iconSize: [44, 44],
            iconAnchor: [22, 22]
        });

        // Add CSS for the pegman
        addPegmanStyles();

        // Create the pegman marker at a corner of the map (floating position)
        createFloatingPegman();
    }

    function addPegmanStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Street View Pegman - Floating Draggable Icon */
            .street-view-pegman-floating {
                position: fixed;
                bottom: 100px;
                right: 70px;
                z-index: 1000;
                cursor: grab;
                user-select: none;
                transition: transform 0.15s ease;
            }

            .street-view-pegman-floating:hover {
                transform: scale(1.1);
            }

            .street-view-pegman-floating:active {
                cursor: grabbing;
                transform: scale(1.2);
            }

            .street-view-pegman-floating.dragging {
                opacity: 0.8;
                cursor: grabbing;
                transform: scale(1.3);
                z-index: 2000;
            }

            .pegman-container {
                position: relative;
                width: 44px;
                height: 44px;
            }

            .pegman-icon {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 40px;
                height: 40px;
                background: #8b0000;
                border: 3px solid #ff4444;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                font-size: 18px;
                box-shadow: 0 4px 12px rgba(139, 0, 0, 0.5);
                transition: all 0.2s ease;
            }

            .pegman-icon:hover {
                background: #a31515;
                box-shadow: 0 6px 20px rgba(139, 0, 0, 0.7);
            }

            .pegman-pulse {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 40px;
                height: 40px;
                border: 2px solid #ff4444;
                border-radius: 50%;
                animation: pegman-pulse 2s infinite;
            }

            @keyframes pegman-pulse {
                0% {
                    width: 40px;
                    height: 40px;
                    opacity: 1;
                }
                100% {
                    width: 70px;
                    height: 70px;
                    opacity: 0;
                }
            }

            .pegman-tooltip {
                position: absolute;
                bottom: -30px;
                left: 50%;
                transform: translateX(-50%);
                background: #000;
                color: #fff;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-family: 'Roboto Mono', monospace;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                white-space: nowrap;
                opacity: 0;
                transition: opacity 0.2s ease;
                pointer-events: none;
            }

            .street-view-pegman-floating:hover .pegman-tooltip {
                opacity: 1;
            }

            .street-view-pegman-floating.dragging .pegman-tooltip {
                opacity: 1;
                bottom: -35px;
            }

            /* Drop indicator on map */
            .street-view-drop-indicator {
                position: absolute;
                width: 60px;
                height: 60px;
                margin-left: -30px;
                margin-top: -30px;
                pointer-events: none;
                z-index: 1500;
            }

            .drop-indicator-ring {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 50px;
                height: 50px;
                border: 3px dashed #ff4444;
                border-radius: 50%;
                animation: drop-ring-pulse 1s infinite;
            }

            @keyframes drop-ring-pulse {
                0%, 100% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.1);
                    opacity: 0.7;
                }
            }

            .drop-indicator-center {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 12px;
                height: 12px;
                background: #ff4444;
                border-radius: 50%;
                box-shadow: 0 0 10px #ff4444;
            }

            /* Street View marker on map after drop */
            .street-view-marker {
                cursor: pointer;
            }

            .sv-marker-icon {
                width: 32px;
                height: 32px;
                background: #8b0000;
                border: 3px solid #fff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                font-size: 14px;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
                transition: all 0.2s ease;
            }

            .sv-marker-icon:hover {
                transform: scale(1.15);
                background: #a31515;
            }

            .sv-marker-pulse {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 32px;
                height: 32px;
                border: 2px solid #ff4444;
                border-radius: 50%;
                animation: sv-marker-pulse 1.5s infinite;
            }

            @keyframes sv-marker-pulse {
                0% {
                    width: 32px;
                    height: 32px;
                    opacity: 1;
                }
                100% {
                    width: 56px;
                    height: 56px;
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function createFloatingPegman() {
        // Create the floating pegman element
        const pegman = document.createElement('div');
        pegman.id = 'streetViewPegman';
        pegman.className = 'street-view-pegman-floating';
        pegman.innerHTML = `
            <div class="pegman-container">
                <div class="pegman-icon">
                    <i class="fas fa-street-view"></i>
                </div>
                <div class="pegman-pulse"></div>
                <div class="pegman-tooltip">Drag to street</div>
            </div>
        `;

        document.body.appendChild(pegman);

        // Setup drag and drop
        setupPegmanDragDrop(pegman);
    }

    function setupPegmanDragDrop(pegman) {
        let isDragging = false;
        let startX, startY;
        let originalX, originalY;
        let dropIndicator = null;

        // Get original position
        const rect = pegman.getBoundingClientRect();
        originalX = rect.left;
        originalY = rect.top;

        // Mouse down - start drag
        pegman.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            state.isDraggingStreetView = true;
            
            startX = e.clientX;
            startY = e.clientY;
            
            pegman.classList.add('dragging');
            pegman.style.position = 'fixed';
            pegman.style.left = `${rect.left}px`;
            pegman.style.top = `${rect.top}px`;
            pegman.style.right = 'auto';
            pegman.style.bottom = 'auto';

            // Create drop indicator
            dropIndicator = createDropIndicator();

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // Touch support
        pegman.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            isDragging = true;
            state.isDraggingStreetView = true;
            
            startX = touch.clientX;
            startY = touch.clientY;
            
            pegman.classList.add('dragging');
            pegman.style.position = 'fixed';
            pegman.style.left = `${rect.left}px`;
            pegman.style.top = `${rect.top}px`;
            pegman.style.right = 'auto';
            pegman.style.bottom = 'auto';

            dropIndicator = createDropIndicator();

            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
        }, { passive: false });

        function onMouseMove(e) {
            if (!isDragging) return;

            const newX = e.clientX - 22;
            const newY = e.clientY - 22;

            pegman.style.left = `${newX}px`;
            pegman.style.top = `${newY}px`;

            // Update drop indicator position
            updateDropIndicator(dropIndicator, e.clientX, e.clientY);

            // Check if over map
            const mapBounds = elements.map.getBoundingClientRect();
            const isOverMap = e.clientX >= mapBounds.left && 
                              e.clientX <= mapBounds.right && 
                              e.clientY >= mapBounds.top && 
                              e.clientY <= mapBounds.bottom;

            pegman.style.opacity = isOverMap ? '1' : '0.6';
            dropIndicator.style.display = isOverMap ? 'block' : 'none';
        }

        function onTouchMove(e) {
            e.preventDefault();
            const touch = e.touches[0];
            
            const newX = touch.clientX - 22;
            const newY = touch.clientY - 22;

            pegman.style.left = `${newX}px`;
            pegman.style.top = `${newY}px`;

            updateDropIndicator(dropIndicator, touch.clientX, touch.clientY);
        }

        function onMouseUp(e) {
            if (!isDragging) return;
            
            isDragging = false;
            state.isDraggingStreetView = false;
            pegman.classList.remove('dragging');

            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            // Check if dropped on map
            handlePegmanDrop(e.clientX, e.clientY, pegman, dropIndicator);
        }

        function onTouchEnd(e) {
            if (!isDragging) return;
            
            const touch = e.changedTouches[0];
            isDragging = false;
            state.isDraggingStreetView = false;
            pegman.classList.remove('dragging');

            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);

            handlePegmanDrop(touch.clientX, touch.clientY, pegman, dropIndicator);
        }
    }

    function createDropIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'street-view-drop-indicator';
        indicator.innerHTML = `
            <div class="drop-indicator-ring"></div>
            <div class="drop-indicator-center"></div>
        `;
        indicator.style.display = 'none';
        document.body.appendChild(indicator);
        return indicator;
    }

    function updateDropIndicator(indicator, x, y) {
        if (!indicator) return;
        indicator.style.left = `${x}px`;
        indicator.style.top = `${y}px`;
    }

    function handlePegmanDrop(clientX, clientY, pegman, dropIndicator) {
        // Remove drop indicator
        if (dropIndicator) {
            dropIndicator.remove();
        }

        // Check if dropped on map
        const mapBounds = elements.map.getBoundingClientRect();
        const isOverMap = clientX >= mapBounds.left && 
                          clientX <= mapBounds.right && 
                          clientY >= mapBounds.top && 
                          clientY <= mapBounds.bottom;

        // Reset pegman to original position
        resetPegmanPosition(pegman);

        if (isOverMap) {
            // Convert screen coordinates to map coordinates
            const mapX = clientX - mapBounds.left;
            const mapY = clientY - mapBounds.top;
            const latlng = state.map.containerPointToLatLng([mapX, mapY]);

            console.log('📍 Street View dropped at:', latlng.lat, latlng.lng);

            // Store drop location
            state.streetViewDropLocation = {
                lat: latlng.lat,
                lng: latlng.lng
            };

            // Add marker at drop location and open street view
            addStreetViewMarker(latlng.lat, latlng.lng);
            openStreetView(latlng.lat, latlng.lng);
        }
    }

    function resetPegmanPosition(pegman) {
        pegman.style.position = 'fixed';
        pegman.style.left = 'auto';
        pegman.style.top = 'auto';
        pegman.style.right = '70px';
        pegman.style.bottom = '100px';
        pegman.style.opacity = '1';
    }

    function addStreetViewMarker(lat, lng) {
        // Remove existing street view marker
        if (state.streetViewMarker) {
            state.map.removeLayer(state.streetViewMarker);
        }

        const icon = L.divIcon({
            className: 'street-view-marker',
            html: `
                <div class="sv-marker-pulse"></div>
                <div class="sv-marker-icon">
                    <i class="fas fa-street-view"></i>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        state.streetViewMarker = L.marker([lat, lng], { icon })
            .addTo(state.map)
            .on('click', () => {
                openStreetView(lat, lng);
            });

        return state.streetViewMarker;
    }

    /* ============================================ */
    /* MAPILLARY STREET VIEW */
    /* ============================================ */

    async function openStreetView(lat, lng) {
        console.log('🛣️ Opening Street View at:', lat, lng);

        // Check if Mapillary token is set
        if (!CONFIG.mapillaryAccessToken || CONFIG.mapillaryAccessToken === accessToken: 'MLY|7096961157099603|7fb2ed4b52bc77827ab9451bf2ec3d8c',) {
            showErrorNotification('Mapillary API key required. See console for instructions.');
            console.error(`
╔════════════════════════════════════════════════════════════╗
║  MAPILLARY API KEY REQUIRED (FREE)                        ║
╠════════════════════════════════════════════════════════════╣
║  1. Go to: https://www.mapillary.com/developer            ║
║  2. Create a FREE account                                  ║
║  3. Go to Dashboard > Developers                           ║
║  4. Click "Register Application"                           ║
║  5. Copy your Client Token (starts with MLY|)              ║
║  6. Replace 'MLY|YOUR_ACCESS_TOKEN_HERE' in CONFIG         ║
╚════════════════════════════════════════════════════════════╝
            `);
            return;
        }

        // Show loading
        elements.streetViewLoading.classList.remove('hidden');
        elements.streetViewEmpty.classList.add('hidden');

        try {
            // Search for nearby Mapillary images
            const imageData = await findMapillaryImage(lat, lng);

            if (!imageData) {
                console.log('❌ No Mapillary coverage at this location');
                showErrorNotification('No street imagery available at this location');
                elements.streetViewLoading.classList.add('hidden');
                
                // Remove the marker since there's no imagery
                if (state.streetViewMarker) {
                    state.map.removeLayer(state.streetViewMarker);
                    state.streetViewMarker = null;
                }
                return;
            }

            // Imagery found - activate split screen
            console.log('✅ Found Mapillary image:', imageData.id);
            activateSplitScreen();

            // Initialize or update Mapillary viewer
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
        // Search in increasingly larger areas
        const searchRadii = [0.0005, 0.001, 0.002, 0.005, 0.01];

        for (const radius of searchRadii) {
            try {
                const bbox = `${lng - radius},${lat - radius},${lng + radius},${lat + radius}`;
                const url = `https://graph.mapillary.com/images?access_token=${CONFIG.mapillaryAccessToken}&fields=id,geometry,captured_at,compass_angle&bbox=${bbox}&limit=1`;

                const response = await fetchWithTimeout(url, {}, CONFIG.mapillaryTimeoutMs);
                const data = await response.json();

                if (data.data && data.data.length > 0) {
                    const image = data.data[0];
                    return {
                        id: image.id,
                        lat: image.geometry.coordinates[1],
                        lng: image.geometry.coordinates[0],
                        capturedAt: image.captured_at,
                        compassAngle: image.compass_angle
                    };
                }
            } catch (error) {
                console.warn(`Mapillary search at radius ${radius} failed:`, error);
            }
        }

        return null;
    }

    async function initMapillaryViewer(imageId) {
        return new Promise((resolve, reject) => {
            try {
                // Check if Mapillary JS is loaded
                if (typeof mapillary === 'undefined') {
                    throw new Error('Mapillary JS not loaded');
                }

                if (!state.mapillaryViewer) {
                    // Create new viewer
                    state.mapillaryViewer = new mapillary.Viewer({
                        accessToken: CONFIG.mapillaryAccessToken,
                        container: elements.mapillaryViewer,
                        imageId: imageId,
                        component: {
                            cover: false,
                            bearing: { size: mapillary.ComponentSize.Small }
                        }
                    });

                    // Event handlers
                    state.mapillaryViewer.on('load', () => {
                        elements.streetViewLoading.classList.add('hidden');
                        resolve();
                    });

                    state.mapillaryViewer.on('image', (event) => {
                        if (event.image) {
                            const date = event.image.capturedAt 
                                ? new Date(event.image.capturedAt).toLocaleDateString() 
                                : 'Unknown date';
                            elements.streetViewLocation.textContent = `Captured: ${date}`;

                            // Update marker position to match current image
                            if (state.streetViewMarker && event.image.lngLat) {
                                state.streetViewMarker.setLatLng([
                                    event.image.lngLat.lat,
                                    event.image.lngLat.lng
                                ]);
                            }
                        }
                    });

                    state.mapillaryViewer.on('error', (error) => {
                        console.error('Mapillary viewer error:', error);
                        elements.streetViewLoading.classList.add('hidden');
                        reject(error);
                    });

                } else {
                    // Move existing viewer to new image
                    state.mapillaryViewer.moveTo(imageId)
                        .then(() => {
                            elements.streetViewLoading.classList.add('hidden');
                            resolve();
                        })
                        .catch(reject);
                }

                // Timeout fallback
                setTimeout(() => {
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

        // Invalidate map size after transition
        setTimeout(() => {
            state.map.invalidateSize();
        }, 350);
    }

    function closeStreetView() {
        elements.mapPanel.classList.remove('split');
        elements.streetViewPanel.classList.add('hidden');
        elements.resizeHandle.classList.add('hidden');
        elements.streetViewLoading.classList.add('hidden');
        elements.streetViewEmpty.classList.add('hidden');
        elements.streetViewBtn.classList.remove('active');
        state.isStreetViewOpen = false;

        // Remove street view marker
        if (state.streetViewMarker) {
            state.map.removeLayer(state.streetViewMarker);
            state.streetViewMarker = null;
        }

        // Invalidate map size
        setTimeout(() => {
            state.map.invalidateSize();
        }, 350);
    }

    /* ============================================ */
    /* TILE LAYER MANAGEMENT */
    /* ============================================ */

    async function setMapLayer(layerName) {
        const provider = TILE_PROVIDERS[layerName];
        if (!provider) {
            console.error('Unknown layer:', layerName);
            return false;
        }

        // Remove existing layers
        if (state.currentBaseLayer) {
            state.map.removeLayer(state.currentBaseLayer);
        }
        state.currentOverlays.forEach(layer => {
            if (state.map.hasLayer(layer)) {
                state.map.removeLayer(layer);
            }
        });
        state.currentOverlays = [];

        // Try base layers with fallback
        let baseLayerSet = false;
        for (const layerConfig of provider.layers) {
            try {
                const tileLayer = await createTileLayer(layerConfig);
                if (tileLayer) {
                    state.currentBaseLayer = tileLayer;
                    tileLayer.addTo(state.map);
                    console.log(`✅ Base layer: ${layerConfig.name}`);
                    baseLayerSet = true;
                    break;
                }
            } catch (error) {
                console.warn(`❌ Base layer ${layerConfig.name} failed:`, error);
            }
        }

        if (!baseLayerSet) {
            console.warn('All base layers failed, using OSM fallback');
            state.currentBaseLayer = L.tileLayer(
                'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                { maxZoom: 19, maxNativeZoom: 19 }
            ).addTo(state.map);
        }

        // Add overlays if defined
        if (provider.overlays) {
            for (const overlayConfig of provider.overlays) {
                try {
                    const overlay = L.tileLayer(overlayConfig.url, {
                        maxZoom: overlayConfig.maxZoom || 20,
                        subdomains: overlayConfig.subdomains || 'abc',
                        pane: 'overlayPane',
                        opacity: 0.9
                    });
                    overlay.addTo(state.map);
                    state.currentOverlays.push(overlay);
                } catch (error) {
                    console.warn(`Overlay failed:`, error);
                }
            }
        }

        state.currentLayer = layerName;
        saveStorage(CONFIG.storageKeys.layer, layerName);
        updateLayerUI();

        return true;
    }

    function createTileLayer(config) {
        return new Promise((resolve) => {
            const layer = L.tileLayer(config.url, {
                attribution: config.attribution || '',
                maxZoom: config.maxZoom || 20,
                maxNativeZoom: config.maxNativeZoom || config.maxZoom || 19,
                subdomains: config.subdomains || 'abc',
                errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                crossOrigin: true
            });

            // Resolve quickly
            setTimeout(() => resolve(layer), 300);
        });
    }

    function updateLayerUI() {
        elements.layerOptions.forEach(option => {
            const isActive = option.dataset.layer === state.currentLayer;
            option.classList.toggle('active', isActive);
        });

        const layerNames = {
            streets: 'Streets',
            satellite: 'Satellite',
            dark: 'Dark',
            hybrid: 'Hybrid'
        };
        elements.currentLayerDisplay.textContent = layerNames[state.currentLayer] || 'Streets';
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
        state.map.on('mousemove', (e) => {
            const { lat, lng } = e.latlng;
            elements.cursorCoords.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        });

        state.map.on('zoomend', () => {
            const zoom = state.map.getZoom();
            elements.zoomLevel.textContent = zoom;
            checkMaxZoom();
        });

        state.map.on('zoomstart', () => {
            elements.maxZoomWarning.classList.add('hidden');
        });

        state.map.on('click', () => {
            hideSearchDropdown();
            hideLayerPanel();
        });

        elements.zoomLevel.textContent = state.map.getZoom();
    }

    function checkMaxZoom() {
        const currentZoom = state.map.getZoom();
        const provider = TILE_PROVIDERS[state.currentLayer];
        
        if (!provider) return;

        const maxNative = provider.layers[0]?.maxNativeZoom || 19;
        
        if (currentZoom > maxNative) {
            state.maxZoomReached = true;
            elements.maxZoomWarning.classList.remove('hidden');
            
            setTimeout(() => {
                elements.maxZoomWarning.classList.add('hidden');
            }, 3000);
        } else {
            state.maxZoomReached = false;
            elements.maxZoomWarning.classList.add('hidden');
        }

        // Prevent excessive overzoom
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
            console.log('📍 Using home location for bias');
        }
    }

    function getCurrentPosition(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: timeout,
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
        let providerUsed = 'Unknown';

        for (const provider of GEOCODE_PROVIDERS) {
            if (state.providerFailures[provider.name] >= 3) continue;

            try {
                results = await geocodeWithProvider(provider, query);

                if (results && results.length > 0) {
                    state.providerFailures[provider.name] = 0;
                    providerUsed = provider.name;
                    state.currentProvider = provider.name;
                    updateProviderStatus(provider.name);
                    break;
                }
            } catch (error) {
                state.providerFailures[provider.name] = 
                    (state.providerFailures[provider.name] || 0) + 1;
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

        switch (provider.type) {
            case 'photon':
                return await geocodePhoton(provider.url, query, signal);
            case 'nominatim':
                return await geocodeNominatim(provider.url, query, signal);
            case 'arcgis':
                return await geocodeArcGIS(provider.url, query, signal);
            default:
                throw new Error(`Unknown provider: ${provider.type}`);
        }
    }

    async function geocodePhoton(baseUrl, query, signal) {
        const params = new URLSearchParams({
            q: query,
            limit: CONFIG.maxSearchResults,
            lang: 'en'
        });

        if (state.biasLocation) {
            params.append('lat', state.biasLocation.lat);
            params.append('lon', state.biasLocation.lng);
        }

        const response = await fetchWithTimeout(`${baseUrl}?${params}`, { signal });
        const data = await response.json();

        if (!data.features?.length) return [];

        return data.features.map(f => ({
            id: generateId(),
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            name: formatPhotonName(f.properties),
            displayName: formatPhotonDisplay(f.properties),
            type: f.properties.osm_value || 'place',
            provider: 'Photon'
        }));
    }

    function formatPhotonName(props) {
        if (props.housenumber && props.street) {
            return `${props.housenumber} ${props.street}`;
        }
        return props.name || props.street || props.city || 'Unknown';
    }

    function formatPhotonDisplay(props) {
        const parts = [];
        if (props.housenumber && props.street) {
            parts.push(`${props.housenumber} ${props.street}`);
        } else if (props.street) {
            parts.push(props.street);
        } else if (props.name) {
            parts.push(props.name);
        }
        if (props.city) parts.push(props.city);
        if (props.state) parts.push(props.state);
        return parts.join(', ') || 'Unknown';
    }

    async function geocodeNominatim(baseUrl, query, signal) {
        const params = new URLSearchParams({
            q: query,
            format: 'json',
            addressdetails: 1,
            limit: CONFIG.maxSearchResults
        });

        if (state.biasLocation) {
            const offset = CONFIG.biasRadiusKm / 111;
            const lngOffset = offset / Math.cos(state.biasLocation.lat * Math.PI / 180);
            params.append('viewbox', [
                state.biasLocation.lng - lngOffset,
                state.biasLocation.lat + offset,
                state.biasLocation.lng + lngOffset,
                state.biasLocation.lat - offset
            ].join(','));
            params.append('bounded', '0');
        }

        const response = await fetchWithTimeout(`${baseUrl}?${params}`, { signal });
        const data = await response.json();

        if (!Array.isArray(data) || !data.length) return [];

        return data.map(item => ({
            id: generateId(),
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            name: formatNominatimName(item),
            displayName: item.display_name,
            type: item.type || 'place',
            provider: 'Nominatim'
        }));
    }

    function formatNominatimName(item) {
        if (item.address) {
            if (item.address.house_number && item.address.road) {
                return `${item.address.house_number} ${item.address.road}`;
            }
            return item.address.road || item.address.suburb || item.name;
        }
        return item.display_name.split(',')[0];
    }

    async function geocodeArcGIS(baseUrl, query, signal) {
        const params = new URLSearchParams({
            f: 'json',
            singleLine: query,
            maxLocations: CONFIG.maxSearchResults
        });

        if (state.biasLocation) {
            params.append('location', `${state.biasLocation.lng},${state.biasLocation.lat}`);
            params.append('distance', Math.round(CONFIG.biasRadiusMiles * 1609.34));
        }

        const response = await fetchWithTimeout(`${baseUrl}?${params}`, { signal });
        const data = await response.json();

        if (!data.candidates?.length) return [];

        return data.candidates.map(c => ({
            id: generateId(),
            lat: c.location.y,
            lng: c.location.x,
            name: c.address.split(',')[0],
            displayName: c.address,
            type: 'address',
            provider: 'ArcGIS'
        }));
    }

    async function reverseGeocode(lat, lng) {
        for (const provider of REVERSE_GEOCODE_PROVIDERS) {
            try {
                const result = await reverseGeocodeWithProvider(provider, lat, lng);
                if (result) return result;
            } catch (error) {
                console.warn(`Reverse geocode failed:`, error);
            }
        }

        return {
            name: 'Unknown Location',
            displayName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            lat,
            lng
        };
    }

    async function reverseGeocodeWithProvider(provider, lat, lng) {
        let url;

        switch (provider.type) {
            case 'nominatim':
                url = `${provider.url}?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
                const nomData = await fetchWithTimeout(url);
                const nomJson = await nomData.json();
                if (nomJson?.display_name) {
                    return {
                        name: formatNominatimName(nomJson),
                        displayName: nomJson.display_name,
                        lat, lng
                    };
                }
                break;

            case 'photon':
                url = `${provider.url}?lat=${lat}&lon=${lng}`;
                const photonData = await fetchWithTimeout(url);
                const photonJson = await photonData.json();
                if (photonJson.features?.[0]) {
                    const props = photonJson.features[0].properties;
                    return {
                        name: formatPhotonName(props),
                        displayName: formatPhotonDisplay(props),
                        lat, lng
                    };
                }
                break;

            case 'arcgis':
                url = `${provider.url}?location=${lng},${lat}&f=json`;
                const arcData = await fetchWithTimeout(url);
                const arcJson = await arcData.json();
                if (arcJson.address) {
                    return {
                        name: arcJson.address.Address || arcJson.address.Match_addr,
                        displayName: arcJson.address.Match_addr,
                        lat, lng
                    };
                }
                break;
        }

        return null;
    }

    async function fetchWithTimeout(url, options = {}, timeout = CONFIG.requestTimeoutMs) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: options.signal || controller.signal
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    function sortResultsByDistance(results) {
        if (!state.biasLocation) return results;

        return results.map(r => {
            r.distance = calculateDistance(
                state.biasLocation.lat,
                state.biasLocation.lng,
                r.lat,
                r.lng
            );
            return r;
        }).sort((a, b) => {
            const aLocal = a.distance <= CONFIG.biasRadiusMiles;
            const bLocal = b.distance <= CONFIG.biasRadiusMiles;
            if (aLocal && !bLocal) return -1;
            if (!aLocal && bLocal) return 1;
            return a.distance - b.distance;
        });
    }

    function updateProviderStatus(name) {
        const statusEl = elements.providerStatus?.querySelector('span');
        if (statusEl) statusEl.textContent = name;
    }

    /* ============================================ */
    /* SEARCH UI */
    /* ============================================ */

    function displaySearchResults(results) {
        elements.searchLoading.classList.add('hidden');
        elements.searchError.classList.add('hidden');
        elements.searchDropdown.classList.remove('hidden');
        elements.resultCount.textContent = `${results.length} found`;
        elements.searchResults.innerHTML = '';

        results.forEach((result, index) => {
            const li = document.createElement('li');
            li.className = 'search-result-item';
            li.dataset.index = index;

            const distance = result.distance ? formatDistance(result.distance) : '';
            const isLocal = result.distance && result.distance <= CONFIG.biasRadiusMiles;
            const icon = getResultIcon(result.type);

            li.innerHTML = `
                <span class="result-icon"><i class="fas fa-${icon}"></i></span>
                <div class="result-content">
                    <div class="result-title">${escapeHtml(result.name)}</div>
                    <div class="result-subtitle">${escapeHtml(result.displayName)}</div>
                </div>
                ${distance ? `<span class="result-distance ${isLocal ? 'local' : ''}">${distance}</span>` : ''}
            `;

            li.addEventListener('click', () => selectSearchResult(result));
            li.addEventListener('mouseenter', () => setActiveResult(index));

            elements.searchResults.appendChild(li);
        });

        state.searchResults = results;
        state.activeResultIndex = -1;
    }

    function getResultIcon(type) {
        const icons = {
            house: 'home', building: 'building', street: 'road',
            city: 'city', address: 'map-marker-alt', residential: 'home'
        };
        const lowerType = (type || '').toLowerCase();
        for (const [key, icon] of Object.entries(icons)) {
            if (lowerType.includes(key)) return icon;
        }
        return 'map-marker-alt';
    }

    function setActiveResult(index) {
        const items = elements.searchResults.querySelectorAll('.search-result-item');
        items.forEach((item, i) => {
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

        showToast(`Located: ${result.name}`, 'success', 2000);
    }

    function flyToLocation(lat, lng, zoom = CONFIG.defaultZoom) {
        const provider = TILE_PROVIDERS[state.currentLayer];
        const maxNative = provider?.layers[0]?.maxNativeZoom || 19;
        const safeZoom = Math.min(zoom, maxNative + 1);

        state.map.flyTo([lat, lng], safeZoom, {
            duration: CONFIG.flyToDuration,
            easeLinearity: 0.25
        });
    }

    /* ============================================ */
    /* TACTICAL MARKER */
    /* ============================================ */

    function addTacticalMarker(lat, lng) {
        if (state.currentMarker) {
            state.map.removeLayer(state.currentMarker);
        }

        const icon = L.divIcon({
            className: 'tactical-marker',
            html: `
                <div class="marker-pulse"></div>
                <div class="marker-dot"></div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        state.currentMarker = L.marker([lat, lng], { icon }).addTo(state.map);
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

        state.searchHistory = state.searchHistory.filter(h => {
            const latDiff = Math.abs(h.lat - result.lat);
            const lngDiff = Math.abs(h.lng - result.lng);
            return latDiff > 0.0001 || lngDiff > 0.0001;
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
        
        elements.historyList.innerHTML = state.searchHistory.map(item => `
            <li class="history-item" data-id="${item.id}">
                <span class="history-item-icon"><i class="fas fa-map-marker-alt"></i></span>
                <div class="history-item-content">
                    <div class="history-item-title">${escapeHtml(item.name)}</div>
                    <div class="history-item-time">${formatTimeAgo(item.timestamp)}</div>
                </div>
                <button class="history-item-delete" data-id="${item.id}">
                    <i class="fas fa-times"></i>
                </button>
            </li>
        `).join('');

        elements.historyList.querySelectorAll('.history-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if (!e.target.closest('.history-item-delete')) {
                    const item = state.searchHistory.find(h => h.id === el.dataset.id);
                    if (item) selectSearchResult(item);
                }
            });
        });

        elements.historyList.querySelectorAll('.history-item-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeFromHistory(btn.dataset.id);
            });
        });
    }

    function removeFromHistory(id) {
        state.searchHistory = state.searchHistory.filter(h => h.id !== id);
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

        elements.searchInput.addEventListener('input', (e) => {
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

        elements.searchInput.addEventListener('keydown', handleSearchKeydown);

        elements.searchInput.addEventListener('focus', () => {
            if (elements.searchInput.value.length >= 2 && state.searchResults?.length) {
                elements.searchDropdown.classList.remove('hidden');
            }
        });

        elements.searchBtn.addEventListener('click', () => {
            const query = elements.searchInput.value;
            if (query.length >= 2) searchAddress(query);
        });

        if (elements.clearSearch) {
            elements.clearSearch.addEventListener('click', () => {
                elements.searchInput.value = '';
                elements.clearSearch.classList.add('hidden');
                hideSearchDropdown();
                elements.searchInput.focus();
            });
        }

        elements.myLocationBtn.addEventListener('click', goToMyLocation);
        
        elements.streetViewBtn.addEventListener('click', () => {
            if (state.isStreetViewOpen) {
                closeStreetView();
            } else if (state.currentLocation) {
                addStreetViewMarker(state.currentLocation.lat, state.currentLocation.lng);
                openStreetView(state.currentLocation.lat, state.currentLocation.lng);
            } else {
                showToast('Drag the red icon to a street to view', 'info', 3000);
            }
        });

        elements.zoomIn.addEventListener('click', () => state.map.zoomIn());
        elements.zoomOut.addEventListener('click', () => state.map.zoomOut());
        elements.homeBtn.addEventListener('click', goToHome);
        elements.rotateBtn.addEventListener('click', () => showToast('Rotation reset', 'info', 2000));
        elements.layerBtn.addEventListener('click', toggleLayerPanel);

        if (elements.closeLayerPanel) {
            elements.closeLayerPanel.addEventListener('click', hideLayerPanel);
        }

        elements.layerOptions.forEach(option => {
            option.addEventListener('click', () => {
                setMapLayer(option.dataset.layer);
                hideLayerPanel();
            });
        });

        if (elements.toggleLabels) {
            elements.toggleLabels.addEventListener('change', (e) => {
                state.overlays.labels = e.target.checked;
                saveStorage(CONFIG.storageKeys.overlays, state.overlays);
            });
        }

        if (elements.toggleHouseNumbers) {
            elements.toggleHouseNumbers.addEventListener('change', (e) => {
                state.overlays.houseNumbers = e.target.checked;
                saveStorage(CONFIG.storageKeys.overlays, state.overlays);
            });
        }

        if (elements.toggleBuildings) {
            elements.toggleBuildings.addEventListener('change', (e) => {
                state.overlays.buildings = e.target.checked;
                saveStorage(CONFIG.storageKeys.overlays, state.overlays);
            });
        }

        if (elements.historyToggle) {
            elements.historyToggle.addEventListener('click', () => {
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
            elements.openStreetViewCard.addEventListener('click', () => {
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
            elements.closeShortcuts.addEventListener('click', () => {
                elements.shortcutsModal.classList.add('hidden');
            });
        }

        document.addEventListener('click', (e) => {
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

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (state.activeResultIndex < count - 1) {
                    setActiveResult(state.activeResultIndex + 1);
                    items[state.activeResultIndex]?.scrollIntoView({ block: 'nearest' });
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (state.activeResultIndex > 0) {
                    setActiveResult(state.activeResultIndex - 1);
                    items[state.activeResultIndex]?.scrollIntoView({ block: 'nearest' });
                }
                break;

            case 'Enter':
                e.preventDefault();
                if (state.activeResultIndex >= 0 && state.searchResults?.[state.activeResultIndex]) {
                    selectSearchResult(state.searchResults[state.activeResultIndex]);
                } else if (elements.searchInput.value.length >= 2) {
                    searchAddress(elements.searchInput.value);
                }
                break;

            case 'Escape':
                hideSearchDropdown();
                elements.searchInput.blur();
                break;
        }
    }

    function handleGlobalKeydown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case '/':
            case 's':
            case 'S':
                e.preventDefault();
                elements.searchInput.focus();
                break;
            case 'Escape':
                hideLocationCard();
                hideSearchDropdown();
                hideLayerPanel();
                closeStreetView();
                elements.shortcutsModal?.classList.add('hidden');
                break;
            case '1': setMapLayer('streets'); break;
            case '2': setMapLayer('satellite'); break;
            case '3': setMapLayer('dark'); break;
            case '4': setMapLayer('hybrid'); break;
            case 'h':
            case 'H': goToHome(); break;
            case 'l':
            case 'L': goToMyLocation(); break;
            case 'v':
            case 'V':
                if (state.currentLocation) {
                    addStreetViewMarker(state.currentLocation.lat, state.currentLocation.lng);
                    openStreetView(state.currentLocation.lat, state.currentLocation.lng);
                }
                break;
            case 'm':
            case 'M': toggleLayerPanel(); break;
            case '+':
            case '=': state.map.zoomIn(); break;
            case '-': state.map.zoomOut(); break;
            case '?': elements.shortcutsModal?.classList.toggle('hidden'); break;
        }
    }

    /* ============================================ */
    /* ACTION HANDLERS */
    /* ============================================ */

    async function goToMyLocation() {
        try {
            showToast('Getting location...', 'info', 2000);

            const position = await getCurrentPosition(10000);
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            state.userLocation = { lat, lng };
            const location = await reverseGeocode(lat, lng);

            addTacticalMarker(lat, lng);
            flyToLocation(lat, lng, 17);
            state.currentLocation = { lat, lng, ...location };
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
        showToast(`Home: ${CONFIG.home.name}`, 'info', 2000);
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

        const coords = `${state.currentLocation.lat.toFixed(6)}, ${state.currentLocation.lng.toFixed(6)}`;

        try {
            await navigator.clipboard.writeText(coords);
            showToast('Coordinates copied', 'success', 2000);
        } catch (error) {
            // Fallback for older browsers
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
        const { lat, lng } = state.currentLocation;
        const url = `https://www.google.com/maps?q=${lat},${lng}`;
        window.open(url, '_blank');
    }

    function zoomToMax() {
        if (!state.currentLocation) return;

        const provider = TILE_PROVIDERS[state.currentLayer];
        const maxNative = provider?.layers[0]?.maxNativeZoom || 19;
        
        flyToLocation(state.currentLocation.lat, state.currentLocation.lng, maxNative);
    }

    /* ============================================ */
    /* RESIZE HANDLE FOR SPLIT VIEW */
    /* ============================================ */

    function setupResizeHandle() {
        if (!elements.resizeHandle) return;

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        elements.resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = elements.mapPanel.offsetWidth;

            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            document.addEventListener('mousemove', onResizeMove);
            document.addEventListener('mouseup', onResizeEnd);
        });

        function onResizeMove(e) {
            if (!isResizing) return;

            const diff = e.clientX - startX;
            const newWidth = startWidth + diff;
            const containerWidth = elements.appContainer.offsetWidth;

            // Constrain between 30% and 70%
            const minWidth = containerWidth * 0.3;
            const maxWidth = containerWidth * 0.7;

            if (newWidth >= minWidth && newWidth <= maxWidth) {
                const percentage = (newWidth / containerWidth) * 100;
                elements.mapPanel.style.flex = `0 0 ${percentage}%`;
                
                // Update resize handle position
                elements.resizeHandle.style.left = `${newWidth}px`;

                // Invalidate map size
                state.map.invalidateSize();
            }
        }

        function onResizeEnd() {
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            document.removeEventListener('mousemove', onResizeMove);
            document.removeEventListener('mouseup', onResizeEnd);

            // Final map size update
            state.map.invalidateSize();
        }
    }

    /* ============================================ */
    /* INITIALIZATION */
    /* ============================================ */

    async function init() {
        console.log('🚀 Tactical Command Map starting...');

        try {
            cacheElements();
            await initializeMap();
            setupEventListeners();
            setupResizeHandle();

            console.log('✅ Tactical Command Map ready');

            // Log Mapillary API instructions if not configured
            if (!CONFIG.mapillaryAccessToken || CONFIG.mapillaryAccessToken ===accessToken: 'MLY|7096961157099603|7fb2ed4b52bc77827ab9451bf2ec3d8c',) {
                console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                    MAPILLARY API KEY SETUP                         ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  To enable Street View, you need a FREE Mapillary API key:        ║
║                                                                    ║
║  1. Go to: https://www.mapillary.com/developer/api-documentation  ║
║                                                                    ║
║  2. Click "Sign Up" (it's free, owned by Meta/Facebook)           ║
║                                                                    ║
║  3. After signing in, go to Dashboard > Developers                 ║
║                                                                    ║
║  4. Click "Register Application"                                   ║
║     - Name: Tactical Map (or anything)                             ║
║     - Description: Personal scanner map                            ║
║     - Website: Your GitHub pages URL or localhost                  ║
║                                                                    ║
║  5. Copy the "Client Token" (starts with MLY|...)                  ║
║                                                                    ║
║  6. Replace 'MLY|YOUR_ACCESS_TOKEN_HERE' in CONFIG at top of JS    ║
║                                                                    ║
║  FREE TIER: 25,000 requests/month (plenty for personal use)        ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
                `);
            }

        } catch (error) {
            console.error('❌ Initialization failed:', error);
            showToast('Failed to initialize. Please refresh.', 'error', 0);
        }
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
