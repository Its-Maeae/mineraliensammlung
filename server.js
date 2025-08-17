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

// MULTER KONFIGURATION - MUSS VOR DEN API-ROUTEN STEHEN!
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
            initVitrineSystem();
        }
    });
}

// Erweiterte Datenbank-Schema-Erstellung
function initVitrineSystem() {
    console.log('🛏️ Initialisiere Vitrinensystem...');
    
    // Vitrinen-Tabelle
    const createShowcasesTable = `
        CREATE TABLE IF NOT EXISTS showcases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT,
            description TEXT,
            image_path TEXT,
            code TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    // Regale-Tabelle
    const createShelvesTable = `
        CREATE TABLE IF NOT EXISTS shelves (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            showcase_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            image_path TEXT,
            code TEXT NOT NULL,
            full_code TEXT NOT NULL,
            position_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (showcase_id) REFERENCES showcases (id) ON DELETE CASCADE,
            UNIQUE(showcase_id, code)
        )
    `;
    
    db.serialize(() => {
        db.run(createShowcasesTable, (err) => {
            if (err) {
                console.error('Fehler beim Erstellen der Vitrinen-Tabelle:', err);
            } else {
                console.log('✅ Vitrinen-Tabelle bereit.');
            }
        });
        
        db.run(createShelvesTable, (err) => {
            if (err) {
                console.error('Fehler beim Erstellen der Regale-Tabelle:', err);
            } else {
                console.log('✅ Regale-Tabelle bereit.');
                // Nach dem Erstellen der Tabellen die automatische Erstellung starten
                autoCreateShowcasesAndShelves();
            }
        });
    });
}

// Automatisches Erstellen von Vitrinen und Regalen basierend auf vorhandenen Mineralien
function autoCreateShowcasesAndShelves() {
    console.log('🔍 Analysiere vorhandene Mineralien für automatische Vitrine/Regal-Erstellung...');
    
    db.all("SELECT DISTINCT shelf FROM minerals WHERE shelf IS NOT NULL AND shelf != '' AND shelf LIKE '%-%'", [], (err, rows) => {
        if (err) {
            console.error('Fehler beim Analysieren der Regale:', err);
            return;
        }
        
        const shelvesCodes = rows.map(row => row.shelf);
        const showcasesSet = new Set();
        const shelvesData = [];
        
        shelvesCodes.forEach(shelfCode => {
            const match = shelfCode.match(/^(V\d+)-(.+)$/);
            if (match) {
                const showcaseCode = match[1];
                const shelfOnlyCode = match[2];
                
                showcasesSet.add(showcaseCode);
                shelvesData.push({
                    showcaseCode,
                    shelfCode: shelfOnlyCode,
                    fullCode: shelfCode
                });
            }
        });
        
        console.log(`🛏️ Gefunden: ${showcasesSet.size} Vitrinen, ${shelvesData.length} Regale`);
        
        // Vitrinen erstellen
        const showcasePromises = Array.from(showcasesSet).map(showcaseCode => {
            return new Promise((resolve) => {
                const vitrineName = `Vitrine ${showcaseCode.substring(1)}`;
                
                db.run(
                    'INSERT OR IGNORE INTO showcases (name, code, description) VALUES (?, ?, ?)',
                    [vitrineName, showcaseCode, `Automatisch erstellt aus vorhandenen Mineralien`],
                    function(err) {
                        if (err) {
                            console.error(`Fehler beim Erstellen der Vitrine ${showcaseCode}:`, err);
                        } else {
                            console.log(`✅ Vitrine erstellt: ${vitrineName} (${showcaseCode})`);
                        }
                        resolve();
                    }
                );
            });
        });
        
        // Warten bis alle Vitrinen erstellt sind, dann Regale erstellen
        Promise.all(showcasePromises).then(() => {
            // Regale erstellen
            shelvesData.forEach(shelfData => {
                db.get('SELECT id FROM showcases WHERE code = ?', [shelfData.showcaseCode], (err, showcaseRow) => {
                    if (err || !showcaseRow) {
                        console.error(`Vitrine ${shelfData.showcaseCode} nicht gefunden`);
                        return;
                    }
                    
                    const regalName = `Regal ${shelfData.shelfCode}`;
                    
                    db.run(
                        'INSERT OR IGNORE INTO shelves (showcase_id, name, code, full_code, description) VALUES (?, ?, ?, ?, ?)',
                        [
                            showcaseRow.id, 
                            regalName, 
                            shelfData.shelfCode, 
                            shelfData.fullCode,
                            `Automatisch erstellt aus vorhandenen Mineralien`
                        ],
                        function(err) {
                            if (err) {
                                console.error(`Fehler beim Erstellen des Regals ${shelfData.fullCode}:`, err);
                            } else {
                                console.log(`✅ Regal erstellt: ${regalName} (${shelfData.fullCode})`);
                            }
                        }
                    );
                });
            });
        });
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

// API ROUTES FÜR VITRINEN

// Alle Vitrinen abrufen
app.get('/api/showcases', (req, res) => {
    const query = `
        SELECT 
            s.*,
            COUNT(sh.id) as shelf_count,
            COALESCE(SUM(CASE WHEN m.id IS NOT NULL THEN 1 ELSE 0 END), 0) as mineral_count
        FROM showcases s
        LEFT JOIN shelves sh ON s.id = sh.showcase_id
        LEFT JOIN minerals m ON sh.full_code = m.shelf
        GROUP BY s.id
        ORDER BY s.code
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Datenbankfehler beim Abrufen der Vitrinen:', err);
            res.status(500).json({ error: 'Datenbankfehler' });
        } else {
            res.json(rows);
        }
    });
});

// Einzelne Vitrine mit Regalen abrufen
app.get('/api/showcases/:id', (req, res) => {
    const { id } = req.params;
    
    const showcaseQuery = 'SELECT * FROM showcases WHERE id = ?';
    const shelvesQuery = `
        SELECT 
            sh.*,
            COUNT(m.id) as mineral_count
        FROM shelves sh
        LEFT JOIN minerals m ON sh.full_code = m.shelf
        WHERE sh.showcase_id = ?
        GROUP BY sh.id
        ORDER BY sh.position_order, sh.code
    `;
    
    db.get(showcaseQuery, [id], (err, showcase) => {
        if (err) {
            return res.status(500).json({ error: 'Datenbankfehler' });
        }
        if (!showcase) {
            return res.status(404).json({ error: 'Vitrine nicht gefunden' });
        }
        
        db.all(shelvesQuery, [id], (err, shelves) => {
            if (err) {
                return res.status(500).json({ error: 'Datenbankfehler' });
            }
            
            res.json({
                ...showcase,
                shelves: shelves
            });
        });
    });
});

// Neue Vitrine erstellen
app.post('/api/showcases', upload.single('image'), (req, res) => {
    const { name, location, description, code } = req.body;
    
    if (!name || !code) {
        return res.status(400).json({ error: 'Name und Code sind erforderlich' });
    }
    
    // Code-Format validieren (V + Zahlen)
    if (!/^V\d+$/.test(code)) {
        return res.status(400).json({ error: 'Code muss im Format V## sein (z.B. V01)' });
    }
    
    let imagePath = null;
    if (req.file) {
        imagePath = req.file.filename;
        processImage(req.file.path);
    }
    
    const insertQuery = `
        INSERT INTO showcases (name, location, description, code, image_path)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(insertQuery, [name, location, description, code, imagePath], function(err) {
        if (err) {
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                res.status(400).json({ error: 'Eine Vitrine mit diesem Code existiert bereits' });
            } else {
                console.error('Datenbankfehler:', err);
                res.status(500).json({ error: 'Datenbankfehler' });
            }
        } else {
            console.log(`✅ Neue Vitrine hinzugefügt: ${name} (${code})`);
            res.json({
                id: this.lastID,
                name,
                code,
                message: 'Vitrine erfolgreich hinzugefügt'
            });
        }
    });
});

// Vitrine aktualisieren
app.put('/api/showcases/:id', upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { name, location, description, code } = req.body;
    
    if (!name || !code) {
        return res.status(400).json({ error: 'Name und Code sind erforderlich' });
    }
    
    if (!/^V\d+$/.test(code)) {
        return res.status(400).json({ error: 'Code muss im Format V## sein (z.B. V01)' });
    }
    
    db.get('SELECT * FROM showcases WHERE id = ?', [id], (err, existingShowcase) => {
        if (err) {
            return res.status(500).json({ error: 'Datenbankfehler' });
        }
        if (!existingShowcase) {
            return res.status(404).json({ error: 'Vitrine nicht gefunden' });
        }
        
        let imagePath = existingShowcase.image_path;
        
        if (req.file) {
            if (existingShowcase.image_path) {
                const oldImagePath = path.join(uploadsDir, existingShowcase.image_path);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            imagePath = req.file.filename;
            processImage(req.file.path);
        }
        
        const updateQuery = `
            UPDATE showcases 
            SET name = ?, location = ?, description = ?, code = ?, image_path = ?
            WHERE id = ?
        `;
        
        db.run(updateQuery, [name, location, description, code, imagePath, id], function(err) {
            if (err) {
                console.error('Datenbankfehler:', err);
                res.status(500).json({ error: 'Datenbankfehler' });
            } else {
                console.log(`✅ Vitrine aktualisiert: ${name} (${code})`);
                res.json({ id, name, message: 'Vitrine erfolgreich aktualisiert' });
            }
        });
    });
});

// Vitrine löschen
app.delete('/api/showcases/:id', (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM showcases WHERE id = ?', [id], (err, showcase) => {
        if (err) {
            return res.status(500).json({ error: 'Datenbankfehler' });
        }
        if (!showcase) {
            return res.status(404).json({ error: 'Vitrine nicht gefunden' });
        }
        
        // Prüfen ob Regale mit Mineralien existieren
        db.get(`
            SELECT COUNT(*) as count 
            FROM shelves sh 
            LEFT JOIN minerals m ON sh.full_code = m.shelf 
            WHERE sh.showcase_id = ? AND m.id IS NOT NULL
        `, [id], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Datenbankfehler' });
            }
            
            if (result.count > 0) {
                return res.status(400).json({ 
                    error: 'Vitrine kann nicht gelöscht werden, da noch Mineralien zugeordnet sind' 
                });
            }
            
            // Bild löschen falls vorhanden
            if (showcase.image_path) {
                const imagePath = path.join(uploadsDir, showcase.image_path);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
            
            // Vitrine löschen (Regale werden durch CASCADE automatisch gelöscht)
            db.run('DELETE FROM showcases WHERE id = ?', [id], function(err) {
                if (err) {
                    console.error('Datenbankfehler:', err);
                    res.status(500).json({ error: 'Datenbankfehler' });
                } else {
                    console.log(`🗑️ Vitrine gelöscht: ${showcase.name}`);
                    res.json({ message: 'Vitrine erfolgreich gelöscht' });
                }
            });
        });
    });
});

// API ROUTES FÜR REGALE

// Neues Regal zu einer Vitrine hinzufügen
app.post('/api/showcases/:showcaseId/shelves', upload.single('image'), (req, res) => {
    const { showcaseId } = req.params;
    const { name, description, code, position_order = 0 } = req.body;
    
    if (!name || !code) {
        return res.status(400).json({ error: 'Name und Code sind erforderlich' });
    }
    
    // Vitrine existiert?
    db.get('SELECT * FROM showcases WHERE id = ?', [showcaseId], (err, showcase) => {
        if (err) {
            return res.status(500).json({ error: 'Datenbankfehler' });
        }
        if (!showcase) {
            return res.status(404).json({ error: 'Vitrine nicht gefunden' });
        }
        
        const fullCode = `${showcase.code}-${code}`;
        let imagePath = null;
        
        if (req.file) {
            imagePath = req.file.filename;
            processImage(req.file.path);
        }
        
        const insertQuery = `
            INSERT INTO shelves (showcase_id, name, description, code, full_code, position_order, image_path)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(insertQuery, [showcaseId, name, description, code, fullCode, position_order, imagePath], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    res.status(400).json({ error: 'Ein Regal mit diesem Code existiert bereits in dieser Vitrine' });
                } else {
                    console.error('Datenbankfehler:', err);
                    res.status(500).json({ error: 'Datenbankfehler' });
                }
            } else {
                console.log(`✅ Neues Regal hinzugefügt: ${name} (${fullCode})`);
                res.json({
                    id: this.lastID,
                    name,
                    fullCode,
                    message: 'Regal erfolgreich hinzugefügt'
                });
            }
        });
    });
});

// Regal aktualisieren
app.put('/api/shelves/:id', upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { name, description, code, position_order } = req.body;
    
    if (!name || !code) {
        return res.status(400).json({ error: 'Name und Code sind erforderlich' });
    }
    
    db.get(`
        SELECT sh.*, sc.code as showcase_code 
        FROM shelves sh 
        LEFT JOIN showcases sc ON sh.showcase_id = sc.id 
        WHERE sh.id = ?
    `, [id], (err, existingShelf) => {
        if (err) {
            return res.status(500).json({ error: 'Datenbankfehler' });
        }
        if (!existingShelf) {
            return res.status(404).json({ error: 'Regal nicht gefunden' });
        }
        
        const fullCode = `${existingShelf.showcase_code}-${code}`;
        let imagePath = existingShelf.image_path;
        
        if (req.file) {
            if (existingShelf.image_path) {
                const oldImagePath = path.join(uploadsDir, existingShelf.image_path);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            imagePath = req.file.filename;
            processImage(req.file.path);
        }
        
        const updateQuery = `
            UPDATE shelves 
            SET name = ?, description = ?, code = ?, full_code = ?, position_order = ?, image_path = ?
            WHERE id = ?
        `;
        
        db.run(updateQuery, [name, description, code, fullCode, position_order, imagePath, id], function(err) {
            if (err) {
                console.error('Datenbankfehler:', err);
                res.status(500).json({ error: 'Datenbankfehler' });
            } else {
                console.log(`✅ Regal aktualisiert: ${name} (${fullCode})`);
                res.json({ id, name, fullCode, message: 'Regal erfolgreich aktualisiert' });
            }
        });
    });
});

// Regal löschen
app.delete('/api/shelves/:id', (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM shelves WHERE id = ?', [id], (err, shelf) => {
        if (err) {
            return res.status(500).json({ error: 'Datenbankfehler' });
        }
        if (!shelf) {
            return res.status(404).json({ error: 'Regal nicht gefunden' });
        }
        
        // Prüfen ob noch Mineralien zugeordnet sind
        db.get('SELECT COUNT(*) as count FROM minerals WHERE shelf = ?', [shelf.full_code], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Datenbankfehler' });
            }
            
            if (result.count > 0) {
                return res.status(400).json({ 
                    error: 'Regal kann nicht gelöscht werden, da noch Mineralien zugeordnet sind' 
                });
            }
            
            // Bild löschen
            if (shelf.image_path) {
                const imagePath = path.join(uploadsDir, shelf.image_path);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
            
            db.run('DELETE FROM shelves WHERE id = ?', [id], function(err) {
                if (err) {
                    console.error('Datenbankfehler:', err);
                    res.status(500).json({ error: 'Datenbankfehler' });
                } else {
                    console.log(`🗑️ Regal gelöscht: ${shelf.name}`);
                    res.json({ message: 'Regal erfolgreich gelöscht' });
                }
            });
        });
    });
});

// Mineralien für ein bestimmtes Regal abrufen
app.get('/api/shelves/:id/minerals', (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT m.*, sh.name as shelf_name, sc.name as showcase_name
        FROM shelves sh
        LEFT JOIN minerals m ON sh.full_code = m.shelf
        LEFT JOIN showcases sc ON sh.showcase_id = sc.id
        WHERE sh.id = ?
        ORDER BY m.name
    `;
    
    db.all(query, [id], (err, rows) => {
        if (err) {
            console.error('Datenbankfehler:', err);
            res.status(500).json({ error: 'Datenbankfehler' });
        } else {
            // Erste Row enthält Regal-Infos, auch wenn keine Mineralien vorhanden
            const shelfInfo = rows.length > 0 ? {
                shelf_name: rows[0].shelf_name,
                showcase_name: rows[0].showcase_name
            } : null;
            
            const minerals = rows.filter(row => row.id !== null);
            
            res.json({
                shelfInfo,
                minerals
            });
        }
    });
});

// API ROUTES FÜR MINERALIEN

// WICHTIG: Filter-Route muss VOR der allgemeinen Mineralien-Route stehen!
// Eindeutige Werte für Filter abrufen
app.get('/api/minerals/filters', (req, res) => {
    console.log('🔍 Filter-Route aufgerufen');
    
    const queries = {
        colors: 'SELECT DISTINCT color FROM minerals WHERE color IS NOT NULL AND color != "" ORDER BY color',
        locations: 'SELECT DISTINCT location FROM minerals WHERE location IS NOT NULL AND location != "" ORDER BY location',
        purchase_locations: 'SELECT DISTINCT purchase_location FROM minerals WHERE purchase_location IS NOT NULL AND purchase_location != "" ORDER BY purchase_location',
        rock_types: 'SELECT DISTINCT rock_type FROM minerals WHERE rock_type IS NOT NULL AND rock_type != "" ORDER BY rock_type',
        shelves: 'SELECT DISTINCT shelf FROM minerals WHERE shelf IS NOT NULL AND shelf != "" ORDER BY shelf'
    };

    const results = {};
    let completed = 0;
    const totalQueries = Object.keys(queries).length;

    if (totalQueries === 0) {
        return res.json({
            colors: [],
            locations: [],
            purchase_locations: [],
            rock_types: [],
            shelves: []
        });
    }

    Object.keys(queries).forEach(key => {
        db.all(queries[key], [], (err, rows) => {
            if (err) {
                console.error(`Fehler beim Abrufen von ${key}:`, err);
                results[key] = [];
            } else {
                results[key] = rows.map(row => Object.values(row)[0]).filter(value => value && value.trim() !== '');
                console.log(`✅ ${key}: ${results[key].length} Einträge gefunden`);
            }
            
            completed++;
            if (completed === totalQueries) {
                console.log('📊 Filter-Daten vollständig geladen:', results);
                res.json(results);
            }
        });
    });
});

// Alle Mineralien abrufen UND Suche/Filter (kombinierte Route)
app.get('/api/minerals', (req, res) => {
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

    console.log('Ausgeführte Abfrage:', query);
    console.log('Parameter:', params);

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Datenbankfehler:', err);
            res.status(500).json({ error: 'Datenbankfehler' });
        } else {
            console.log(`✅ ${rows.length} Mineralien gefunden`);
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
🌐 Netzwerk-Zugriff: http://192.168.178.50:${PORT}
📂 Bilder-Ordner: ${uploadsDir}
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