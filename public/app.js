let minerals = [];
let filteredMinerals = [];
let filters = {};
let currentFilters = {
    search: '',
    color: '',
    location: '',
    rock_type: '',
    sortBy: 'name'
};

// API Base URL - dynamisch ermittelt
const API_BASE = window.location.protocol + '//' + window.location.hostname + ':8084/api';

// Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    loadFilterOptions();
});

// Fehler anzeigen
function showError(message) {
    const container = document.getElementById('errorContainer');
    container.innerHTML = `<div class="error-message">${message}</div>`;
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

// Erfolg anzeigen
function showSuccess(message) {
    const container = document.getElementById('errorContainer');
    container.innerHTML = `<div class="success-message">${message}</div>`;
    setTimeout(() => {
        container.innerHTML = '';
    }, 3000);
}

// Statistiken laden
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const stats = await response.json();
        
        const statsContainer = document.getElementById('statsContainer');
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${stats.total.count}</div>
                <div>Mineralien gesamt</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.byColor.length}</div>
                <div>Verschiedene Farben</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.byRockType.length}</div>
                <div>Gesteinsarten</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.byLocation.length}</div>
                <div>Fundorte</div>
            </div>
        `;
    } catch (error) {
        console.error('Fehler beim Laden der Statistiken:', error);
        showError('Statistiken konnten nicht geladen werden. Server läuft auf Port 8084?');
    }
}

// Filter-Optionen laden
async function loadFilterOptions() {
    try {
        const response = await fetch(`${API_BASE}/minerals/filters`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const filterData = await response.json();
        
        // Farben-Filter füllen
        const colorSelect = document.getElementById('colorFilter');
        colorSelect.innerHTML = '<option value="">Alle Farben</option>';
        filterData.colors.forEach(color => {
            colorSelect.innerHTML += `<option value="${color}">${color}</option>`;
        });
        
        // Fundorte-Filter füllen
        const locationSelect = document.getElementById('locationFilter');
        locationSelect.innerHTML = '<option value="">Alle Fundorte</option>';
        filterData.locations.forEach(location => {
            locationSelect.innerHTML += `<option value="${location}">${location}</option>`;
        });
        
        // Gesteinsarten-Filter füllen
        const rockTypeSelect = document.getElementById('rockTypeFilter');
        rockTypeSelect.innerHTML = '<option value="">Alle Gesteinsarten</option>';
        filterData.rock_types.forEach(type => {
            rockTypeSelect.innerHTML += `<option value="${type}">${type}</option>`;
        });
        
        filters = filterData;
    } catch (error) {
        console.error('Fehler beim Laden der Filter:', error);
        showError('Filter konnten nicht geladen werden.');
    }
}

// Seiten wechseln
function showPage(pageId) {
    // Alle Seiten verstecken
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Alle Nav-Buttons deaktivieren
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Gewählte Seite anzeigen
    document.getElementById(pageId).classList.add('active');
    document.getElementById(pageId + '-btn').classList.add('active');
    
    if (pageId === 'collection') {
        loadMinerals();
    } else if (pageId === 'home') {
        loadStats();
    }
}

// Aktuelle Filter auslesen
function getCurrentFilters() {
    return {
        search: document.getElementById('searchField').value,
        color: document.getElementById('colorFilter').value,
        location: document.getElementById('locationFilter').value,
        rock_type: document.getElementById('rockTypeFilter').value,
        sortBy: document.getElementById('sortBy').value
    };
}

// Filter-Tags anzeigen
function updateFilterDisplay() {
    const filters = getCurrentFilters();
    const filterInfo = document.getElementById('filterInfo');
    const filterTags = document.getElementById('filterTags');
    
    let tags = [];
    let hasActiveFilters = false;

    if (filters.search) {
        tags.push(`<span class="filter-tag">Suche: "${filters.search}"</span>`);
        hasActiveFilters = true;
    }
    if (filters.color) {
        tags.push(`<span class="filter-tag">Farbe: ${filters.color}</span>`);
        hasActiveFilters = true;
    }
    if (filters.location) {
        tags.push(`<span class="filter-tag">Fundort: ${filters.location}</span>`);
        hasActiveFilters = true;
    }
    if (filters.rock_type) {
        tags.push(`<span class="filter-tag">Gesteinsart: ${filters.rock_type}</span>`);
        hasActiveFilters = true;
    }

    filterTags.innerHTML = tags.join(' ');
    
    if (hasActiveFilters) {
        filterInfo.classList.add('show');
    } else {
        filterInfo.classList.remove('show');
    }
}

// Alle Filter löschen
function clearAllFilters() {
    document.getElementById('searchField').value = '';
    document.getElementById('colorFilter').value = '';
    document.getElementById('locationFilter').value = '';
    document.getElementById('rockTypeFilter').value = '';
    
    applyFiltersAndSort();
}

// Filter und Sortierung anwenden (Hauptfunktion mit intelligenter Suche)
function applyFiltersAndSort() {
    updateFilterDisplay();
    
    const filters = getCurrentFilters();
    console.log('🔍 Angewandte Filter:', filters);

    if (minerals.length === 0) {
        // Falls noch keine Daten geladen sind, lade sie erst
        loadMinerals();
        return;
    }

    // Client-seitige Filterung mit intelligenter Suche
    filteredMinerals = minerals.filter(mineral => {
        // Intelligente Suche: prüft sowohl Name als auch Nummer
        let searchMatch = true;
        if (filters.search !== '') {
            const searchTerm = filters.search.toLowerCase();
            const nameMatch = mineral.name.toLowerCase().includes(searchTerm);
            const numberMatch = mineral.number.toLowerCase().includes(searchTerm);
            searchMatch = nameMatch || numberMatch;
        }
        
        return (
            searchMatch &&
            (filters.color === '' || mineral.color === filters.color) &&
            (filters.location === '' || mineral.location === filters.location) &&
            (filters.rock_type === '' || mineral.rock_type === filters.rock_type)
        );
    });

    // Client-seitige Sortierung
    filteredMinerals.sort((a, b) => {
        let valueA, valueB;
        
        switch (filters.sortBy) {
            case 'number':
                valueA = a.number || '';
                valueB = b.number || '';
                break;
            case 'color':
                valueA = a.color || '';
                valueB = b.color || '';
                break;
            default: // 'name'
                valueA = a.name || '';
                valueB = b.name || '';
                break;
        }

        return valueA.localeCompare(valueB, 'de', { numeric: true });
    });

    console.log(`✅ ${filteredMinerals.length} von ${minerals.length} Mineralien nach Filterung`);
    displayMinerals();
}

// Mineralien vom Server laden
async function loadMinerals() {
    const grid = document.getElementById('mineralsGrid');
    grid.innerHTML = '<div class="loading">Lade Mineralien...</div>';
    
    try {
        // Nur die grundlegenden Daten laden, ohne Filter-Parameter
        const response = await fetch(`${API_BASE}/minerals`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        minerals = await response.json();
        console.log(`📦 ${minerals.length} Mineralien vom Server geladen`);
        
        // Nach dem Laden die Filter anwenden
        applyFiltersAndSort();
    } catch (error) {
        console.error('Fehler beim Laden der Mineralien:', error);
        grid.innerHTML = `<div class="error-message">
            Fehler beim Laden der Mineralien.<br>
            Bitte prüfen Sie, ob der Server auf Port 8084 läuft.<br>
            <small>Fehler: ${error.message}</small>
        </div>`;
        showError('Mineralien konnten nicht geladen werden. Server erreichbar?');
    }
}

// Mineralien anzeigen
function displayMinerals() {
    const grid = document.getElementById('mineralsGrid');
    
    if (filteredMinerals.length === 0) {
        const filters = getCurrentFilters();
        const hasFilters = filters.search || filters.color || filters.location || filters.rock_type;
        
        if (hasFilters) {
            grid.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1; padding: 40px;">Keine Mineralien entsprechen den gewählten Filtern.<br><button onclick="clearAllFilters()" style="margin-top: 10px; padding: 10px 20px; background: #4ecdc4; color: white; border: none; border-radius: 5px; cursor: pointer;">Filter zurücksetzen</button></p>';
        } else {
            grid.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1; padding: 40px;">Keine Mineralien gefunden.</p>';
        }
        return;
    }
    
    // Basis-URL für Bilder
    const imageBase = window.location.protocol + '//' + window.location.hostname + ':8084/images';
    
    grid.innerHTML = filteredMinerals.map(mineral => `
        <div class="mineral-card" onclick="showMineralDetails(${mineral.id})">
            <div class="mineral-image">
                ${mineral.image_path 
                    ? `<img src="${imageBase}/${mineral.image_path}" alt="${mineral.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">`
                    : `<div class="placeholder">📸</div>`
                }
                ${mineral.image_path ? `<div class="placeholder" style="display:none;">📸</div>` : ''}
            </div>
            <div class="mineral-info">
                <h3>${mineral.name}</h3>
                <p><strong>Nr:</strong> ${mineral.number}</p>
                <p><strong>Farbe:</strong> ${mineral.color || 'Nicht angegeben'}</p>
                <p><strong>Fundort:</strong> ${mineral.location || 'Unbekannt'}</p>
            </div>
        </div>
    `).join('');
}

// Mineral-Details anzeigen
async function showMineralDetails(id) {
    try {
        const response = await fetch(`${API_BASE}/minerals/${id}`);
        
        if (!response.ok) {
            throw new Error(`Mineral nicht gefunden`);
        }
        
        const mineral = await response.json();
        const modalContent = document.getElementById('modalContent');
        
        // Basis-URL für Bilder
        const imageBase = window.location.protocol + '//' + window.location.hostname + ':8084/images';
        
        modalContent.innerHTML = `
            <h2>${mineral.name}</h2>
            
            ${mineral.image_path 
                ? `<div class="detail-image"><img src="${imageBase}/${mineral.image_path}" alt="${mineral.name}" onerror="this.style.display='none'"></div>`
                : '<div style="text-align: center; font-size: 80px; margin: 20px 0; color: #ddd;">📸</div>'
            }
            
            <div class="detail-info">
                <div class="detail-item">
                    <span class="detail-label">Steinnummer:</span>
                    <span class="detail-value">${mineral.number}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Farbe:</span>
                    <span class="detail-value">${mineral.color || 'Nicht angegeben'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Fundort:</span>
                    <span class="detail-value">${mineral.location || 'Unbekannt'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Kaufort:</span>
                    <span class="detail-value">${mineral.purchase_location || 'Nicht angegeben'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Gesteinsart:</span>
                    <span class="detail-value">${mineral.rock_type || 'Nicht angegeben'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Regal:</span>
                    <span class="detail-value">${mineral.shelf || 'Nicht angegeben'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Hinzugefügt:</span>
                    <span class="detail-value">${new Date(mineral.created_at).toLocaleDateString('de-DE')}</span>
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <h3>Beschreibung</h3>
                <p style="margin-top: 10px; color: #555; line-height: 1.6;">${mineral.description || 'Keine Beschreibung verfügbar.'}</p>
            </div>
            
            <div style="margin-top: 20px; text-align: center;">
                <button onclick="openEditModal(${mineral.id})" class="btn-edit">Bearbeiten</button>
                <button onclick="deleteMineral(${mineral.id})" class="btn-delete">Löschen</button>
            </div>
        `;

        document.getElementById('mineralModal').style.display = 'flex';
    } catch (error) {
        console.error('Fehler beim Laden der Mineral-Details:', error);
        showError('Details konnten nicht geladen werden.');
    }
}

// Bearbeitungsmodal öffnen
async function openEditModal(id) {
    try {
        const response = await fetch(`${API_BASE}/minerals/${id}`);
        if (!response.ok) {
            throw new Error(`Mineral nicht gefunden`);
        }
        
        const mineral = await response.json();
        
        // Formular mit aktuellen Daten füllen
        document.getElementById('editMineralId').value = mineral.id;
        document.getElementById('editMineralName').value = mineral.name;
        document.getElementById('editMineralNumber').value = mineral.number;
        document.getElementById('editMineralColor').value = mineral.color || '';
        document.getElementById('editMineralDescription').value = mineral.description || '';
        document.getElementById('editMineralLocation').value = mineral.location || '';
        document.getElementById('editMineralPurchaseLocation').value = mineral.purchase_location || '';
        document.getElementById('editMineralRockType').value = mineral.rock_type || '';
        document.getElementById('editMineralShelf').value = mineral.shelf || '';
        
        // Aktuelles Bild anzeigen
        const editImagePreview = document.getElementById('editImagePreview');
        if (mineral.image_path) {
            const imageBase = window.location.protocol + '//' + window.location.hostname + ':8084/images';
            editImagePreview.innerHTML = `
                <img src="${imageBase}/${mineral.image_path}" class="preview-image" alt="Aktuelles Bild">
                <br><small>Aktuelles Bild • Neues Bild hochladen um zu ersetzen</small>
            `;
        } else {
            editImagePreview.innerHTML = `
                📸 Neues Bild hochladen (optional)<br>
                <small>(JPEG, PNG, GIF, WebP - Max. 10MB)</small>
            `;
        }
        
        // Detailmodal schließen und Bearbeitungsmodal öffnen
        closeModal();
        document.getElementById('editModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Fehler beim Öffnen des Bearbeitungsmodals:', error);
        showError('Mineral konnte nicht zum Bearbeiten geladen werden.');
    }
}

// Bearbeitetes Mineral speichern
async function saveEditedMineral(event) {
    event.preventDefault();
    
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Speichere...';
    
    try {
        const id = document.getElementById('editMineralId').value;
        const formData = new FormData();
        
        formData.append('name', document.getElementById('editMineralName').value);
        formData.append('number', document.getElementById('editMineralNumber').value);
        formData.append('color', document.getElementById('editMineralColor').value);
        formData.append('description', document.getElementById('editMineralDescription').value);
        formData.append('location', document.getElementById('editMineralLocation').value);
        formData.append('purchase_location', document.getElementById('editMineralPurchaseLocation').value);
        formData.append('rock_type', document.getElementById('editMineralRockType').value);
        formData.append('shelf', document.getElementById('editMineralShelf').value);
        
        // Neues Bild hinzufügen falls hochgeladen
        const imageFile = document.getElementById('editMineralImage').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }
        
        const response = await fetch(`${API_BASE}/minerals/${id}`, {
            method: 'PUT',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess('Mineral erfolgreich aktualisiert!');
            closeEditModal();
            
            // Listen aktualisieren
            await loadFilterOptions();
            await loadStats();
            await loadMinerals();
        } else {
            showError(`Fehler beim Aktualisieren: ${result.error}`);
        }
        
    } catch (error) {
        console.error('Fehler beim Speichern der Änderungen:', error);
        showError('Netzwerkfehler beim Speichern der Änderungen.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Änderungen speichern';
    }
}

// Bearbeitungsmodal schließen
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    
    // Formular zurücksetzen
    document.getElementById('editForm').reset();
    document.getElementById('editImagePreview').innerHTML = `
        📸 Neues Bild hochladen (optional)<br>
        <small>(JPEG, PNG, GIF, WebP - Max. 10MB)</small>
    `;
}

// Vorschau für Bearbeitungsbild
function previewEditImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('editImagePreview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <img src="${e.target.result}" class="preview-image" alt="Neue Vorschau">
                <br><small>Neues Bild: ${file.name}</small>
            `;
        };
        reader.readAsDataURL(file);
    }
}

// Modal schließen
function closeModal() {
    document.getElementById('mineralModal').style.display = 'none';
}

// Bild-Vorschau (für neues Mineral)
function previewImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('imagePreview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <img src="${e.target.result}" class="preview-image" alt="Vorschau">
                <br><small>${file.name}</small>
            `;
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = `
            📸 Klicken Sie hier um ein Bild hochzuladen<br>
            <small>(JPEG, PNG, GIF, WebP - Max. 10MB)</small>
        `;
    }
}

// Neues Mineral hinzufügen
async function addMineral(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird hinzugefügt...';
    
    try {
        const formData = new FormData();
        formData.append('name', document.getElementById('mineralName').value);
        formData.append('number', document.getElementById('mineralNumber').value);
        formData.append('color', document.getElementById('mineralColor').value);
        formData.append('description', document.getElementById('mineralDescription').value);
        formData.append('location', document.getElementById('mineralLocation').value);
        formData.append('purchase_location', document.getElementById('mineralPurchaseLocation').value);
        formData.append('rock_type', document.getElementById('mineralRockType').value);
        formData.append('shelf', document.getElementById('mineralShelf').value);
        
        // Bild hinzufügen falls vorhanden
        const imageFile = document.getElementById('mineralImage').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }
        
        const response = await fetch(`${API_BASE}/minerals`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess('Mineral erfolgreich hinzugefügt!');
            event.target.reset();
            document.getElementById('imagePreview').innerHTML = `
                📸 Klicken Sie hier um ein Bild hochzuladen<br>
                <small>(JPEG, PNG, GIF, WebP - Max. 10MB)</small>
            `;
            
            // Filter-Optionen neu laden
            await loadFilterOptions();
            await loadStats();
            
            // Zur Sammlung wechseln nach 2 Sekunden
            setTimeout(() => {
                showPage('collection');
            }, 2000);
        } else {
            showError(`Fehler: ${result.error}`);
        }
    } catch (error) {
        console.error('Fehler beim Hinzufügen des Minerals:', error);
        showError('Netzwerkfehler beim Hinzufügen des Minerals.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Mineral hinzufügen';
    }
}

// Mineral löschen
async function deleteMineral(id) {
    if (!confirm('Möchten Sie dieses Mineral wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/minerals/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess('Mineral erfolgreich gelöscht!');
            closeModal();
            
            // Listen aktualisieren
            await loadFilterOptions();
            await loadStats();
            await loadMinerals();
        } else {
            showError(`Fehler beim Löschen: ${result.error}`);
        }
    } catch (error) {
        console.error('Fehler beim Löschen des Minerals:', error);
        showError('Netzwerkfehler beim Löschen des Minerals.');
    }
}

// Modal schließen bei Klick außerhalb
window.onclick = function(event) {
    const mineralModal = document.getElementById('mineralModal');
    const editModal = document.getElementById('editModal');
    
    if (event.target === mineralModal) {
        closeModal();
    }
    if (event.target === editModal) {
        closeEditModal();
    }
}

// Keyboard-Navigation
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
        closeEditModal();
    }
});