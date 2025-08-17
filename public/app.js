let minerals = [];
let filteredMinerals = [];
let filters = {};
let showcases = [];
let currentShowcaseId = null;
let currentShelfId = null;
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
    } 
    if (pageId === 'vitrines') {
        loadShowcases();
    }
    else if (pageId === 'home') {
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
                <small>(JPEG, PNG, GIF, WebP - Max. 40MB)</small>
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
        <small>(JPEG, PNG, GIF, WebP - Max. 40MB)</small>
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
            <small>(JPEG, PNG, GIF, WebP - Max. 40MB)</small>
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
                <small>(JPEG, PNG, GIF, WebP - Max. 40MB)</small>
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

// JavaScript-Erweiterung für das Vitrinensystem - in app.js hinzufügen

// VITRINEN-MANAGEMENT

// Vitrinen laden
async function loadShowcases() {
    const grid = document.getElementById('vitrinesGrid');
    grid.innerHTML = '<div class="loading">Lade Vitrinen...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/showcases`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        showcases = await response.json();
        console.log(`🏛️ ${showcases.length} Vitrinen geladen`);
        
        displayShowcases();
    } catch (error) {
        console.error('Fehler beim Laden der Vitrinen:', error);
        grid.innerHTML = `<div class="error-message">
            Fehler beim Laden der Vitrinen.<br>
            <small>Fehler: ${error.message}</small>
        </div>`;
        showError('Vitrinen konnten nicht geladen werden.');
    }
}

// Vitrinen anzeigen
function displayShowcases() {
    const grid = document.getElementById('vitrinesGrid');
    
    if (showcases.length === 0) {
        grid.innerHTML = `
            <div class="no-showcases" style="text-align: center; padding: 40px; grid-column: 1/-1;">
                <h3 style="color: #666; margin-bottom: 15px;">🏛️ Noch keine Vitrinen vorhanden</h3>
                <p style="color: #888; margin-bottom: 20px;">Fügen Sie Ihre erste Vitrine hinzu, um Ihre Sammlung zu organisieren.</p>
                <button onclick="openAddVitrineModal()" class="btn-add">Erste Vitrine hinzufügen</button>
            </div>
        `;
        return;
    }
    
    const imageBase = window.location.protocol + '//' + window.location.hostname + ':8084/images';
    
    grid.innerHTML = showcases.map(showcase => `
        <div class="vitrine-card" onclick="showShowcaseDetails(${showcase.id})">
            <div class="vitrine-image">
                ${showcase.image_path 
                    ? `<img src="${imageBase}/${showcase.image_path}" alt="${showcase.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">`
                    : `<div class="placeholder">🏛️</div>`
                }
                ${showcase.image_path ? `<div class="placeholder" style="display:none;">🏛️</div>` : ''}
            </div>
            <div class="vitrine-info">
                <h3>${showcase.name}</h3>
                <p><strong>Code:</strong> ${showcase.code}</p>
                <p><strong>Standort:</strong> ${showcase.location || 'Nicht angegeben'}</p>
                <p><strong>Beschreibung:</strong> ${showcase.description ? (showcase.description.substring(0, 80) + '...') : 'Keine Beschreibung'}</p>
                
                <div class="vitrine-stats">
                    <div class="vitrine-stat">
                        <span class="vitrine-stat-number">${showcase.shelf_count || 0}</span>
                        <span class="vitrine-stat-label">Regale</span>
                    </div>
                    <div class="vitrine-stat">
                        <span class="vitrine-stat-number">${showcase.mineral_count || 0}</span>
                        <span class="vitrine-stat-label">Mineralien</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Modal für neue Vitrine öffnen
function openAddVitrineModal() {
    document.getElementById('addVitrineModal').style.display = 'flex';
    document.getElementById('addVitrineForm').reset();
    document.getElementById('vitrineImagePreview').innerHTML = `
        🏛️ Foto der Vitrine hochladen (optional)<br>
        <small>(JPEG, PNG, GIF, WebP - Max. 40MB)</small>
    `;
}

// Modal für neue Vitrine schließen
function closeAddVitrineModal() {
    document.getElementById('addVitrineModal').style.display = 'none';
}

// Bild-Vorschau für Vitrine
function previewVitrineImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('vitrineImagePreview');
    
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
            🏛️ Foto der Vitrine hochladen (optional)<br>
            <small>(JPEG, PNG, GIF, WebP - Max. 40MB)</small>
        `;
    }
}

// Neue Vitrine hinzufügen
async function addVitrine(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('addVitrineBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird hinzugefügt...';
    
    try {
        const formData = new FormData();
        formData.append('name', document.getElementById('vitrineName').value);
        formData.append('code', document.getElementById('vitrineCode').value.toUpperCase());
        formData.append('location', document.getElementById('vitrineLocation').value);
        formData.append('description', document.getElementById('vitrineDescription').value);
        
        const imageFile = document.getElementById('vitrineImage').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }
        
        const response = await fetch(`${API_BASE}/showcases`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess('Vitrine erfolgreich hinzugefügt!');
            closeAddVitrineModal();
            await loadShowcases();
        } else {
            showError(`Fehler: ${result.error}`);
        }
    } catch (error) {
        console.error('Fehler beim Hinzufügen der Vitrine:', error);
        showError('Netzwerkfehler beim Hinzufügen der Vitrine.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Vitrine hinzufügen';
    }
}

// Vitrine-Details anzeigen
async function showShowcaseDetails(id) {
    try {
        const response = await fetch(`${API_BASE}/showcases/${id}`);
        
        if (!response.ok) {
            throw new Error(`Vitrine nicht gefunden`);
        }
        
        const showcase = await response.json();
        const modalContent = document.getElementById('vitrineDetailContent');
        const imageBase = window.location.protocol + '//' + window.location.hostname + ':8084/images';
        
        modalContent.innerHTML = `
            <div class="vitrine-detail-header">
                <h2>${showcase.name}</h2>
                
                ${showcase.image_path 
                    ? `<div class="vitrine-detail-image"><img src="${imageBase}/${showcase.image_path}" alt="${showcase.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='🏛️'"></div>`
                    : '<div class="vitrine-detail-image">🏛️</div>'
                }
                
                <div class="vitrine-detail-info">
                    <div class="detail-info-card">
                        <h4>Vitrine-Code</h4>
                        <p>${showcase.code}</p>
                    </div>
                    <div class="detail-info-card">
                        <h4>Standort</h4>
                        <p>${showcase.location || 'Nicht angegeben'}</p>
                    </div>
                    <div class="detail-info-card">
                        <h4>Regale</h4>
                        <p>${showcase.shelves.length}</p>
                    </div>
                    <div class="detail-info-card">
                        <h4>Mineralien gesamt</h4>
                        <p>${showcase.shelves.reduce((sum, shelf) => sum + shelf.mineral_count, 0)}</p>
                    </div>
                </div>
                
                <p style="color: #555; line-height: 1.6; margin-top: 15px;">
                    ${showcase.description || 'Keine Beschreibung verfügbar.'}
                </p>
                
                <div class="vitrine-actions">
                    <button onclick="openEditShowcaseModal(${showcase.id})" class="btn-edit">Vitrine bearbeiten</button>
                    <button onclick="deleteShowcase(${showcase.id})" class="btn-delete">Vitrine löschen</button>
                </div>
            </div>
            
            <div class="shelves-section">
                <h3>
                    📚 Regale in dieser Vitrine
                    <button onclick="openAddShelfModal(${showcase.id})" class="btn-add-shelf">Neues Regal hinzufügen</button>
                </h3>
                
                ${showcase.shelves.length === 0 
                    ? '<div class="no-shelves" style="text-align: center; padding: 20px; color: #666; font-style: italic;">Noch keine Regale vorhanden. Fügen Sie das erste Regal hinzu!</div>'
                    : `<div class="shelves-grid">${showcase.shelves.map(shelf => `
                        <div class="shelf-card" onclick="showShelfMinerals(${shelf.id})">
                            <div class="shelf-image">
                                ${shelf.image_path 
                                    ? `<img src="${imageBase}/${shelf.image_path}" alt="${shelf.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">`
                                    : `<div class="placeholder">📚</div>`
                                }
                                ${shelf.image_path ? `<div class="placeholder" style="display:none;">📚</div>` : ''}
                            </div>
                            <div class="shelf-info">
                                <h4>${shelf.name}</h4>
                                <p><strong>Code:</strong> ${shelf.full_code}</p>
                                <p><strong>Position:</strong> ${shelf.position_order}</p>
                                <p>${shelf.description ? (shelf.description.substring(0, 60) + '...') : 'Keine Beschreibung'}</p>
                                <span class="shelf-mineral-count">${shelf.mineral_count} Mineralien</span>
                            </div>
                            <div class="shelf-actions" onclick="event.stopPropagation()">
                                <button onclick="openEditShelfModal(${shelf.id})" class="btn-shelf-edit">Bearbeiten</button>
                                <button onclick="deleteShelf(${shelf.id})" class="btn-shelf-delete">Löschen</button>
                            </div>
                        </div>
                    `).join('')}</div>`
                }
            </div>
        `;

        document.getElementById('vitrineDetailModal').style.display = 'flex';
    } catch (error) {
        console.error('Fehler beim Laden der Vitrine-Details:', error);
        showError('Details konnten nicht geladen werden.');
    }
}

// Vitrine-Detail-Modal schließen
function closeVitrineDetailModal() {
    document.getElementById('vitrineDetailModal').style.display = 'none';
}

// VITRINE BEARBEITEN

// Bearbeitungsmodal für Vitrine öffnen
async function openEditShowcaseModal(id) {
    try {
        const response = await fetch(`${API_BASE}/showcases/${id}`);
        if (!response.ok) {
            throw new Error(`Vitrine nicht gefunden`);
        }
        
        const showcase = await response.json();
        
        document.getElementById('editVitrineId').value = showcase.id;
        document.getElementById('editVitrineName').value = showcase.name;
        document.getElementById('editVitrineCode').value = showcase.code;
        document.getElementById('editVitrineLocation').value = showcase.location || '';
        document.getElementById('editVitrineDescription').value = showcase.description || '';
        
        const editImagePreview = document.getElementById('editVitrineImagePreview');
        if (showcase.image_path) {
            const imageBase = window.location.protocol + '//' + window.location.hostname + ':8084/images';
            editImagePreview.innerHTML = `
                <img src="${imageBase}/${showcase.image_path}" class="preview-image" alt="Aktuelles Bild">
                <br><small>Aktuelles Bild • Neues Bild hochladen um zu ersetzen</small>
            `;
        } else {
            editImagePreview.innerHTML = `
                🏛️ Neues Foto hochladen (optional)<br>
                <small>(JPEG, PNG, GIF, WebP - Max. 40MB)</small>
            `;
        }
        
        closeVitrineDetailModal();
        document.getElementById('editVitrineModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Fehler beim Öffnen des Bearbeitungsmodals:', error);
        showError('Vitrine konnte nicht zum Bearbeiten geladen werden.');
    }
}

// Bearbeitungsmodal für Vitrine schließen
function closeEditVitrineModal() {
    document.getElementById('editVitrineModal').style.display = 'none';
}

// Bild-Vorschau für Vitrine-Bearbeitung
function previewEditVitrineImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('editVitrineImagePreview');
    
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

// Bearbeitete Vitrine speichern
async function saveEditedVitrine(event) {
    event.preventDefault();
    
    const saveBtn = document.getElementById('saveVitrineBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Speichere...';
    
    try {
        const id = document.getElementById('editVitrineId').value;
        const formData = new FormData();
        
        formData.append('name', document.getElementById('editVitrineName').value);
        formData.append('code', document.getElementById('editVitrineCode').value.toUpperCase());
        formData.append('location', document.getElementById('editVitrineLocation').value);
        formData.append('description', document.getElementById('editVitrineDescription').value);
        
        const imageFile = document.getElementById('editVitrineImage').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }
        
        const response = await fetch(`${API_BASE}/showcases/${id}`, {
            method: 'PUT',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess('Vitrine erfolgreich aktualisiert!');
            closeEditVitrineModal();
            await loadShowcases();
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

// Vitrine löschen
async function deleteShowcase(id) {
    if (!confirm('Möchten Sie diese Vitrine wirklich löschen? Alle zugehörigen Regale werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/showcases/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess('Vitrine erfolgreich gelöscht!');
            closeVitrineDetailModal();
            await loadShowcases();
        } else {
            showError(`Fehler beim Löschen: ${result.error}`);
        }
    } catch (error) {
        console.error('Fehler beim Löschen der Vitrine:', error);
        showError('Netzwerkfehler beim Löschen der Vitrine.');
    }
}

// REGAL-MANAGEMENT

// Modal für neues Regal öffnen
function openAddShelfModal(showcaseId) {
    currentShowcaseId = showcaseId;
    document.getElementById('shelfShowcaseId').value = showcaseId;
    document.getElementById('addShelfModal').style.display = 'flex';
    document.getElementById('addShelfForm').reset();
    document.getElementById('shelfImagePreview').innerHTML = `
        📚 Foto des Regals hochladen (optional)<br>
        <small>(JPEG, PNG, GIF, WebP - Max. 40MB)</small>
    `;
}

// Modal für neues Regal schließen
function closeAddShelfModal() {
    document.getElementById('addShelfModal').style.display = 'none';
    currentShowcaseId = null;
}

// Bild-Vorschau für Regal
function previewShelfImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('shelfImagePreview');
    
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
            📚 Foto des Regals hochladen (optional)<br>
            <small>(JPEG, PNG, GIF, WebP - Max. 40MB)</small>
        `;
    }
}

// Neues Regal hinzufügen
async function addShelf(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('addShelfBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird hinzugefügt...';
    
    try {
        const showcaseId = document.getElementById('shelfShowcaseId').value;
        const formData = new FormData();
        
        formData.append('name', document.getElementById('shelfName').value);
        formData.append('code', document.getElementById('shelfCode').value.padStart(2, '0'));
        formData.append('description', document.getElementById('shelfDescription').value);
        formData.append('position_order', document.getElementById('shelfPosition').value || '0');
        
        const imageFile = document.getElementById('shelfImage').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }
        
        const response = await fetch(`${API_BASE}/showcases/${showcaseId}/shelves`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess('Regal erfolgreich hinzugefügt!');
            closeAddShelfModal();
            // Vitrine-Details neu laden
            await showShowcaseDetails(showcaseId);
        } else {
            showError(`Fehler: ${result.error}`);
        }
    } catch (error) {
        console.error('Fehler beim Hinzufügen des Regals:', error);
        showError('Netzwerkfehler beim Hinzufügen des Regals.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Regal hinzufügen';
    }
}

// REGAL BEARBEITEN

// Bearbeitungsmodal für Regal öffnen
async function openEditShelfModal(shelfId) {
    try {
        // Regal-Details laden (wir müssen alle Regale durchsuchen oder eine separate API verwenden)
        const showcaseResponse = await fetch(`${API_BASE}/showcases`);
        const showcases = await showcaseResponse.json();
        
        let shelf = null;
        let showcaseId = null;
        
        for (const showcase of showcases) {
            const detailResponse = await fetch(`${API_BASE}/showcases/${showcase.id}`);
            const showcaseDetail = await detailResponse.json();
            const foundShelf = showcaseDetail.shelves.find(s => s.id === shelfId);
            if (foundShelf) {
                shelf = foundShelf;
                showcaseId = showcase.id;
                break;
            }
        }
        
        if (!shelf) {
            throw new Error('Regal nicht gefunden');
        }
        
        document.getElementById('editShelfId').value = shelf.id;
        document.getElementById('editShelfName').value = shelf.name;
        document.getElementById('editShelfCode').value = shelf.code;
        document.getElementById('editShelfDescription').value = shelf.description || '';
        document.getElementById('editShelfPosition').value = shelf.position_order || '0';
        
        const editImagePreview = document.getElementById('editShelfImagePreview');
        if (shelf.image_path) {
            const imageBase = window.location.protocol + '//' + window.location.hostname + ':8084/images';
            editImagePreview.innerHTML = `
                <img src="${imageBase}/${shelf.image_path}" class="preview-image" alt="Aktuelles Bild">
                <br><small>Aktuelles Bild • Neues Bild hochladen um zu ersetzen</small>
            `;
        } else {
            editImagePreview.innerHTML = `
                📚 Neues Foto hochladen (optional)<br>
                <small>(JPEG, PNG, GIF, WebP - Max. 40MB)</small>
            `;
        }
        
        document.getElementById('editShelfModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Fehler beim Öffnen des Regal-Bearbeitungsmodals:', error);
        showError('Regal konnte nicht zum Bearbeiten geladen werden.');
    }
}

// Bearbeitungsmodal für Regal schließen
function closeEditShelfModal() {
    document.getElementById('editShelfModal').style.display = 'none';
}

// Bild-Vorschau für Regal-Bearbeitung
function previewEditShelfImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('editShelfImagePreview');
    
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

// Bearbeitetes Regal speichern
// Bearbeitetes Regal speichern - FIXED VERSION
async function saveEditedShelf(event) {
    event.preventDefault();
    
    const saveBtn = document.getElementById('saveShelfBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Speichere...';
    
    try {
        const id = document.getElementById('editShelfId').value;
        const formData = new FormData();
        
        // Werte abrufen und validieren
        const name = document.getElementById('editShelfName').value.trim();
        const code = document.getElementById('editShelfCode').value.trim();
        const description = document.getElementById('editShelfDescription').value.trim();
        const position = document.getElementById('editShelfPosition').value || '0';
        
        // Validation
        if (!name) {
            showError('Name ist erforderlich');
            return;
        }
        
        if (!code) {
            showError('Code ist erforderlich');
            return;
        }
        
        // Code validieren - nur Zahlen erlaubt
        if (!/^\d+$/.test(code)) {
            showError('Code darf nur Zahlen enthalten');
            return;
        }
        
        // Debug-Ausgabe
        console.log('Sending shelf data:', {
            name,
            code,
            paddedCode: code.padStart(2, '0'),
            description,
            position
        });
        
        formData.append('name', name);
        formData.append('code', code.padStart(2, '0'));
        formData.append('description', description);
        formData.append('position_order', position);
        
        // Bild hinzufügen falls hochgeladen
        const imageFile = document.getElementById('editShelfImage').files[0];
        if (imageFile) {
            console.log('Adding image file:', imageFile.name);
            formData.append('image', imageFile);
        }
        
        // Debug: FormData Inhalt anzeigen
        for (let [key, value] of formData.entries()) {
            console.log('FormData:', key, value);
        }
        
        const response = await fetch(`${API_BASE}/shelves/${id}`, {
            method: 'PUT',
            body: formData
        });
        
        let result;
        try {
            result = await response.json();
        } catch (e) {
            console.error('Failed to parse JSON response:', e);
            throw new Error('Server returned invalid response');
        }
        
        if (response.ok) {
            showSuccess('Regal erfolgreich aktualisiert!');
            closeEditShelfModal();
            // Aktuelle Vitrine neu laden
            if (currentShowcaseId) {
                await showShowcaseDetails(currentShowcaseId);
            }
        } else {
            console.error('Server error response:', result);
            showError(`Fehler beim Aktualisieren: ${result.error || 'Unbekannter Fehler'}`);
        }
        
    } catch (error) {
        console.error('Fehler beim Speichern der Regal-Änderungen:', error);
        showError(`Netzwerkfehler: ${error.message}`);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Änderungen speichern';
    }
}

// Regal löschen
async function deleteShelf(shelfId) {
    if (!confirm('Möchten Sie dieses Regal wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/shelves/${shelfId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess('Regal erfolgreich gelöscht!');
            // Aktuelle Vitrine neu laden
            if (currentShowcaseId) {
                await showShowcaseDetails(currentShowcaseId);
            }
        } else {
            showError(`Fehler beim Löschen: ${result.error}`);
        }
    } catch (error) {
        console.error('Fehler beim Löschen des Regals:', error);
        showError('Netzwerkfehler beim Löschen des Regals.');
    }
}

// MINERALIEN IM REGAL ANZEIGEN

// Mineralien eines Regals anzeigen
async function showShelfMinerals(shelfId) {
    try {
        const response = await fetch(`${API_BASE}/shelves/${shelfId}/minerals`);
        
        if (!response.ok) {
            throw new Error(`Regal nicht gefunden`);
        }
        
        const data = await response.json();
        const modalContent = document.getElementById('shelfMineralsContent');
        const imageBase = window.location.protocol + '//' + window.location.hostname + ':8084/images';
        
        modalContent.innerHTML = `
            <div class="shelf-minerals-header">
                <h2>📚 ${data.shelfInfo ? data.shelfInfo.shelf_name : 'Regal'}</h2>
                <p style="color: #666; margin-bottom: 10px;">
                    in ${data.shelfInfo ? data.shelfInfo.showcase_name : 'Unbekannte Vitrine'}
                </p>
                <p style="color: #888; font-size: 14px;">
                    ${data.minerals.length} Mineralien in diesem Regal
                </p>
            </div>
            
            ${data.minerals.length === 0 
                ? '<div class="no-minerals">Dieses Regal ist noch leer. Fügen Sie Mineralien über das Admin-Panel hinzu und ordnen Sie sie diesem Regal zu.</div>'
                : `<div class="shelf-minerals-grid">${data.minerals.map(mineral => `
                    <div class="shelf-mineral-card" onclick="showMineralDetails(${mineral.id})">
                        <div class="shelf-mineral-image">
                            ${mineral.image_path 
                                ? `<img src="${imageBase}/${mineral.image_path}" alt="${mineral.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">`
                                : `<div class="placeholder">🔸</div>`
                            }
                            ${mineral.image_path ? `<div class="placeholder" style="display:none;">🔸</div>` : ''}
                        </div>
                        <div class="shelf-mineral-info">
                            <h4>${mineral.name}</h4>
                            <p><strong>Nr:</strong> ${mineral.number}</p>
                            <p><strong>Farbe:</strong> ${mineral.color || 'Nicht angegeben'}</p>
                            <p><strong>Fundort:</strong> ${mineral.location || 'Unbekannt'}</p>
                        </div>
                    </div>
                `).join('')}</div>`
            }
        `;

        document.getElementById('shelfMineralsModal').style.display = 'flex';
        currentShelfId = shelfId;
    } catch (error) {
        console.error('Fehler beim Laden der Regal-Mineralien:', error);
        showError('Mineralien konnten nicht geladen werden.');
    }
}

// Regal-Mineralien-Modal schließen
function closeShelfMineralsModal() {
    document.getElementById('shelfMineralsModal').style.display = 'none';
    currentShelfId = null;
}

// Modal-Event-Listener erweitern
const originalWindowClick = window.onclick;
window.onclick = function(event) {
    if (originalWindowClick) {
        originalWindowClick(event);
    }
    
    const addVitrineModal = document.getElementById('addVitrineModal');
    const editVitrineModal = document.getElementById('editVitrineModal');
    const vitrineDetailModal = document.getElementById('vitrineDetailModal');
    const addShelfModal = document.getElementById('addShelfModal');
    const editShelfModal = document.getElementById('editShelfModal');
    const shelfMineralsModal = document.getElementById('shelfMineralsModal');
    
    if (event.target === addVitrineModal) closeAddVitrineModal();
    if (event.target === editVitrineModal) closeEditVitrineModal();
    if (event.target === vitrineDetailModal) closeVitrineDetailModal();
    if (event.target === addShelfModal) closeAddShelfModal();
    if (event.target === editShelfModal) closeEditShelfModal();
    if (event.target === shelfMineralsModal) closeShelfMineralsModal();
}

// Keyboard-Navigation erweitern
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeAddVitrineModal();
        closeEditVitrineModal();
        closeVitrineDetailModal();
        closeAddShelfModal();
        closeEditShelfModal();
        closeShelfMineralsModal();
    }
});