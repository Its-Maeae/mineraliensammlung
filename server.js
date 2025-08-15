// server.js - Hauptserver für die Mineraliensammlung
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const cors = require('cors');

const app = express();
const PORT = 8084;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statische Dateien für Bilder und Frontend
app.use('/images', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Ordner für Uploads erstellen falls nicht vorhanden
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// SQLite Datenbank initialisieren
const db = new sqlite3.Database('./minerals.db', (err) => {
    if (err) {
        console.error('Fehler beim Öffnen der Datenbank:', err);
    } else {
        console.log('✅ Erfolgreich mit SQLite-Datenbank verbunden.');
        initDatabase();
    }
});

// Datenbank-Schema erstellen
function initDatabase() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS minerals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            number TEXT UNIQUE NOT NULL,
            color TEXT,
            description TEXT,
            location TEXT,
            purchase_location TEXT,
            rock_type TEXT,
            shelf TEXT,
            image_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    db.run(createTableQuery, (err) => {
        if (err) {
            console.error('Fehler beim Erstellen der Tabelle:', err);
        } else {
            console.log('✅ Datenbank-Tabelle bereit.');
            insertSampleData();
        }
    });
}

// Beispieldaten einfügen (nur beim ersten Start)
function insertSampleData() {
    db.get("SELECT COUNT(*) as count FROM minerals", (err, row) => {
        if (err) {
            console.error('Fehler beim Prüfen der Daten:', err);
            return;
        }
        
        if (row.count === 0) {
            console.log('📝 Füge Beispieldaten ein...');
            const sampleMinerals = [
                ['Amethyst', 'MIN-001', 'violett', 'Ein wunderschöner violetter Quarz-Kristall mit ausgezeichneter Klarheit und Farbsättigung.', 'brasilien', 'Mineralienbörse München', 'magmatisch', 'R1-A3'],
                ['Pyrit', 'MIN-002', 'gelb', 'Auch als "Katzengold" bekannt, zeigt dieser Pyrit perfekte Würfelkristalle.', 'deutschland', 'Online-Shop', 'sedimentär', 'R2-B1'],
                ['Malachit', 'MIN-003', 'grün', 'Ein kupferhaltiges Karbonat-Mineral mit charakteristischen grünen Bändern.', 'österreich', 'Lokaler Sammler', 'sedimentär', 'R1-C2'],
                ['Rosenquarz', 'MIN-004', 'rot', 'Ein zart rosa gefärbter Quarz, der als Stein der Liebe bekannt ist.', 'brasilien', 'Mineralienmesse', 'magmatisch', 'R3-A1'],
                ['Bergkristall', 'MIN-005', 'weiß', 'Ein klarer, durchsichtiger Quarz von außergewöhnlicher Reinheit.', 'schweiz', 'Alpensammlung', 'metamorph', 'R2-C3']
            ];
            
            const insertQuery = `INSERT INTO minerals (name, number, color, description, location, purchase_location, rock_type, shelf) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            
            sampleMinerals.forEach(mineral => {
                db.run(insertQuery, mineral, (err) => {
                    if (err) {
                        console.error('Fehler beim Einfügen der Beispieldaten:', err);
                    }
                });
            });
            
            console.log('✅ Beispieldaten eingefügt.');
        }
    });
}

// Multer für Datei-Uploads konfigurieren
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Eindeutiger Dateiname mit Zeitstempel
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname).toLowerCase();
        cb(null, 'mineral-' + uniqueSuffix + extension);
    }
});

// Datei-Filter für Bilder
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Nur Bilddateien sind erlaubt (JPEG, PNG, GIF, WebP)'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB Limit
    }
});

// Bild verarbeiten und optimieren
async function processImage(imagePath) {
    try {
        const outputPath = imagePath.replace(path.extname(imagePath), '_optimized' + path.extname(imagePath));
        
        await sharp(imagePath)
            .resize(800, 600, { 
                fit: 'inside',
                withoutEnlargement: true 
            })
            .jpeg({ quality: 85 })
            .toFile(outputPath);
        
        // Originaldatei löschen und optimierte umbenennen
        fs.unlinkSync(imagePath);
        fs.renameSync(outputPath, imagePath);
        
        console.log(`✅ Bild optimiert: ${imagePath}`);
    } catch (error) {
        console.error('Fehler beim Verarbeiten des Bildes:', error);
    }
}

// API ROUTES

// Alle Mineralien abrufen
app.get('/api/minerals', (req, res) => {
    const query = `SELECT * FROM minerals ORDER BY name ASC`;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Datenbankfehler:', err);
            res.status(500).json({ error: 'Datenbankfehler' });
        } else {
            res.json(rows);
        }
    });
});

// Einzelnes Mineral abrufen
app.get('/api/minerals/:id', (req, res) => {
    const { id } = req.params;
    const query = `SELECT * FROM minerals WHERE id = ?`;
    
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('Datenbankfehler:', err);
            res.status(500).json({ error: 'Datenbankfehler' });
        } else if (!row) {
            res.status(404).json({ error: 'Mineral nicht gefunden' });
        } else {
            res.json(row);
        }
    });
});

// Neues Mineral hinzufügen (mit Bildupload)
app.post('/api/minerals', upload.single('image'), async (req, res) => {
    try {
        const {
            name,
            number,
            color,
            description,
            location,
            purchase_location,
            rock_type,
            shelf
        } = req.body;

        // Validierung
        if (!name || !number) {
            return res.status(400).json({ error: 'Name und Nummer sind erforderlich' });
        }

        let imagePath = null;
        
        // Bild verarbeiten falls hochgeladen
        if (req.file) {
            imagePath = req.file.filename;
            // Bild asynchron optimieren
            processImage(req.file.path);
        }

        const insertQuery = `
            INSERT INTO minerals (name, number, color, description, location, purchase_location, rock_type, shelf, image_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(insertQuery, [name, number, color, description, location, purchase_location, rock_type, shelf, imagePath], function(err) {
            if (err) {
                console.error('Datenbankfehler:', err);
                if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    res.status(400).json({ error: 'Ein Mineral mit dieser Nummer existiert bereits' });
                } else {
                    res.status(500).json({ error: 'Datenbankfehler' });
                }
            } else {
                console.log(`✅ Neues Mineral hinzugefügt: ${name} (ID: ${this.lastID})`);
                res.json({
                    id: this.lastID,
                    name,
                    number,
                    message: 'Mineral erfolgreich hinzugefügt'
                });
            }
        });

    } catch (error) {
        console.error('Fehler beim Hinzufügen des Minerals:', error);
        res.status(500).json({ error: 'Server-Fehler' });
    }
});

// Mineral aktualisieren
app.put('/api/minerals/:id', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            number,
            color,
            description,
            location,
            purchase_location,
            rock_type,
            shelf
        } = req.body;

        // Prüfen ob Mineral existiert
        db.get('SELECT * FROM minerals WHERE id = ?', [id], async (err, existingMineral) => {
            if (err) {
                return res.status(500).json({ error: 'Datenbankfehler' });
            }
            if (!existingMineral) {
                return res.status(404).json({ error: 'Mineral nicht gefunden' });
            }

            let imagePath = existingMineral.image_path;

            // Neues Bild verarbeiten falls hochgeladen
            if (req.file) {
                // Altes Bild löschen
                if (existingMineral.image_path) {
                    const oldImagePath = path.join(uploadsDir, existingMineral.image_path);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }
                
                imagePath = req.file.filename;
                processImage(req.file.path);
            }

            const updateQuery = `
                UPDATE minerals 
                SET name = ?, number = ?, color = ?, description = ?, location = ?, 
                    purchase_location = ?, rock_type = ?, shelf = ?, image_path = ?
                WHERE id = ?
            `;

            db.run(updateQuery, [name, number, color, description, location, purchase_location, rock_type, shelf, imagePath, id], function(err) {
                if (err) {
                    console.error('Datenbankfehler:', err);
                    res.status(500).json({ error: 'Datenbankfehler' });
                } else {
                    console.log(`✅ Mineral aktualisiert: ${name} (ID: ${id})`);
                    res.json({ id, name, message: 'Mineral erfolgreich aktualisiert' });
                }
            });
        });

    } catch (error) {
        console.error('Fehler beim Aktualisieren des Minerals:', error);
        res.status(500).json({ error: 'Server-Fehler' });
    }
});

// Mineral löschen
app.delete('/api/minerals/:id', (req, res) => {
    const { id } = req.params;
    
    // Erst Mineral-Daten abrufen um Bild zu löschen
    db.get('SELECT * FROM minerals WHERE id = ?', [id], (err, mineral) => {
        if (err) {
            return res.status(500).json({ error: 'Datenbankfehler' });
        }
        if (!mineral) {
            return res.status(404).json({ error: 'Mineral nicht gefunden' });
        }

        // Bild löschen falls vorhanden
        if (mineral.image_path) {
            const imagePath = path.join(uploadsDir, mineral.image_path);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log(`🗑️ Bild gelöscht: ${mineral.image_path}`);
            }
        }

        // Mineral aus Datenbank löschen
        db.run('DELETE FROM minerals WHERE id = ?', [id], function(err) {
            if (err) {
                console.error('Datenbankfehler:', err);
                res.status(500).json({ error: 'Datenbankfehler' });
            } else {
                console.log(`🗑️ Mineral gelöscht: ${mineral.name} (ID: ${id})`);
                res.json({ message: 'Mineral erfolgreich gelöscht' });
            }
        });
    });
});

// Suche und Filter
app.get('/api/minerals/search', (req, res) => {
    const { 
        name, 
        number, 
        color, 
        location, 
        purchase_location, 
        rock_type, 
        shelf,
        sortBy = 'name',
        sortOrder = 'ASC'
    } = req.query;

    let query = 'SELECT * FROM minerals WHERE 1=1';
    const params = [];

    // Filter hinzufügen
    if (name) {
        query += ' AND name LIKE ?';
        params.push(`%${name}%`);
    }
    if (number) {
        query += ' AND number LIKE ?';
        params.push(`%${number}%`);
    }
    if (color) {
        query += ' AND color = ?';
        params.push(color);
    }
    if (location) {
        query += ' AND location = ?';
        params.push(location);
    }
    if (purchase_location) {
        query += ' AND purchase_location = ?';
        params.push(purchase_location);
    }
    if (rock_type) {
        query += ' AND rock_type = ?';
        params.push(rock_type);
    }
    if (shelf) {
        query += ' AND shelf = ?';
        params.push(shelf);
    }

    // Sortierung hinzufügen
    const validSortColumns = ['name', 'number', 'color', 'created_at'];
    const validSortOrder = ['ASC', 'DESC'];
    
    if (validSortColumns.includes(sortBy) && validSortOrder.includes(sortOrder.toUpperCase())) {
        query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
    } else {
        query += ' ORDER BY name ASC';
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Datenbankfehler:', err);
            res.status(500).json({ error: 'Datenbankfehler' });
        } else {
            res.json(rows);
        }
    });
});

// Eindeutige Werte für Filter abrufen
app.get('/api/minerals/filters', (req, res) => {
    const queries = {
        colors: 'SELECT DISTINCT color FROM minerals WHERE color IS NOT NULL ORDER BY color',
        locations: 'SELECT DISTINCT location FROM minerals WHERE location IS NOT NULL ORDER BY location',
        purchase_locations: 'SELECT DISTINCT purchase_location FROM minerals WHERE purchase_location IS NOT NULL ORDER BY purchase_location',
        rock_types: 'SELECT DISTINCT rock_type FROM minerals WHERE rock_type IS NOT NULL ORDER BY rock_type',
        shelves: 'SELECT DISTINCT shelf FROM minerals WHERE shelf IS NOT NULL ORDER BY shelf'
    };

    const results = {};
    let completed = 0;

    Object.keys(queries).forEach(key => {
        db.all(queries[key], [], (err, rows) => {
            if (err) {
                console.error(`Fehler beim Abrufen von ${key}:`, err);
                results[key] = [];
            } else {
                results[key] = rows.map(row => Object.values(row)[0]);
            }
            
            completed++;
            if (completed === Object.keys(queries).length) {
                res.json(results);
            }
        });
    });
});

// Statistiken abrufen
app.get('/api/stats', (req, res) => {
    const statsQueries = {
        total: 'SELECT COUNT(*) as count FROM minerals',
        byColor: 'SELECT color, COUNT(*) as count FROM minerals WHERE color IS NOT NULL GROUP BY color ORDER BY count DESC',
        byRockType: 'SELECT rock_type, COUNT(*) as count FROM minerals WHERE rock_type IS NOT NULL GROUP BY rock_type ORDER BY count DESC',
        byLocation: 'SELECT location, COUNT(*) as count FROM minerals WHERE location IS NOT NULL GROUP BY location ORDER BY count DESC'
    };

    const results = {};
    let completed = 0;

    Object.keys(statsQueries).forEach(key => {
        db.all(statsQueries[key], [], (err, rows) => {
            if (err) {
                console.error(`Fehler bei Statistik ${key}:`, err);
                results[key] = key === 'total' ? { count: 0 } : [];
            } else {
                results[key] = key === 'total' ? rows[0] : rows;
            }
            
            completed++;
            if (completed === Object.keys(statsQueries).length) {
                res.json(results);
            }
        });
    });
});

// Fehlerbehandlung für Multer
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Datei zu groß. Maximum 10MB erlaubt.' });
        }
    }
    if (error.message === 'Nur Bilddateien sind erlaubt (JPEG, PNG, GIF, WebP)') {
        return res.status(400).json({ error: error.message });
    }
    next(error);
});

// 404 Handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route nicht gefunden' });
});

// Server starten
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
🌟 ================================
   Mineraliensammlung Server
🌟 ================================
🚀 Server läuft auf: http://localhost:${PORT}
🌐 Netzwerk-Zugriff: http://[Pi-IP]:${PORT}
📁 Bilder-Ordner: ${uploadsDir}
💾 Datenbank: ./minerals.db
🕒 Gestartet: ${new Date().toLocaleString('de-DE')}
🌟 ================================
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Server wird heruntergefahren...');
    db.close((err) => {
        if (err) {
            console.error('Fehler beim Schließen der Datenbank:', err);
        } else {
            console.log('✅ Datenbankverbindung geschlossen.');
        }
        process.exit(0);
    });
});