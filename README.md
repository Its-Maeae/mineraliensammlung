# 🔬 Mineraliensammlung - Digitale Schatzkammer

<div align="center">

![Mineralien Header](https://img.shields.io/badge/🔮_Mineralien-Sammlung-purple?style=for-the-badge&logo=gem&logoColor=white)
![Raspberry Pi](https://img.shields.io/badge/Raspberry_Pi-optimiert-red?style=for-the-badge&logo=raspberrypi&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-v16+-green?style=for-the-badge&logo=node.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Database-blue?style=for-the-badge&logo=sqlite&logoColor=white)

**Eine elegante, moderne Web-Anwendung zur Verwaltung Ihrer Mineraliensammlung**

[📸 Screenshots](#-screenshots) • [🚀 Installation](#-installation) • [💎 Features](#-features) • [🛠️ Technologie](#️-technologie-stack)

---

</div>

## 🌟 Über das Projekt

Willkommen in der digitalen Welt der Mineralien! Diese Anwendung wurde speziell für Sammler entwickelt, die ihre geologischen Schätze professionell verwalten möchten. Von seltenen Kristallen bis hin zu alltäglichen Gesteinen - hier findet jedes Mineral seinen digitalen Platz.

> *"Jeder Stein erzählt eine Geschichte - wir helfen Ihnen dabei, sie zu bewahren."*

### 🎯 Warum diese Anwendung?

- **🏠 Lokale Kontrolle**: Ihre Daten bleiben auf Ihrem Raspberry Pi
- **📱 Responsive Design**: Funktioniert auf Desktop, Tablet und Smartphone
- **🖼️ Bildoptimierung**: Automatische Komprimierung für schnelle Ladezeiten
- **🔍 Intelligente Suche**: Finden Sie jedes Mineral in Sekunden
- **📊 Detaillierte Statistiken**: Behalten Sie den Überblick über Ihre Sammlung

## 💎 Features

<table>
<tr>
<td width="50%">

### 🔍 **Suche & Filter**
- Suche nach Name oder Steinnummer
- Filter nach Farbe, Fundort, Gesteinsart
- Regal-Suche für physische Organisation
- Sortierung nach verschiedenen Kriterien

### 📸 **Bildverwaltung**
- Drag & Drop Bildupload
- Automatische Optimierung (Sharp)
- Unterstützt JPEG, PNG, GIF, WebP
- Maximale Dateigröße: 10MB

</td>
<td width="50%">

### ✏️ **Vollständige CRUD-Operationen**
- Neue Mineralien hinzufügen
- Bestehende Einträge bearbeiten
- Sichere Löschfunktion
- Batch-Import (geplant)

### 📊 **Statistiken & Insights**
- Sammlung nach Farben
- Verteilung der Gesteinsarten
- Fundorte-Übersicht
- Wachstum der Sammlung

</td>
</tr>
</table>

## 🖼️ Screenshots

<div align="center">

### 🏠 Startseite
![Startseite](https://via.placeholder.com/600x300/667eea/ffffff?text=Elegant+Dashboard+mit+Statistiken)

### 💎 Sammlung
![Sammlung](https://via.placeholder.com/600x300/4ecdc4/ffffff?text=Responsive+Mineral+Grid+mit+Filtern)

### ✏️ Admin Panel
![Admin](https://via.placeholder.com/600x300/ff6b6b/ffffff?text=Intuitive+Mineral+Verwaltung)

</div>

## 🚀 Installation

### Voraussetzungen

```bash
📋 Checkliste:
☐ Raspberry Pi (3B+ oder neuer empfohlen)
☐ Node.js v16 oder höher
☐ 500MB freier Speicherplatz
☐ Internetverbindung für Dependencies
```

### 1. Repository klonen

```bash
git clone https://github.com/IhrUsername/mineraliensammlung.git
cd mineraliensammlung
```

### 2. Dependencies installieren

```bash
# Globale Tools installieren
npm run install-global

# Projekt-Dependencies
npm install

# Ordnerstruktur erstellen
npm run setup
```

### 3. Anwendung starten

```bash
# Entwicklungsmodus
npm run dev

# Produktionsmodus
npm run production

# Status prüfen
npm run status
```

### 4. Öffnen Sie Ihren Browser

```
🌐 Lokal: http://localhost:8084
🌍 Netzwerk: http://[Pi-IP-Adresse]:8084
```

## 🗂️ Projektstruktur

```
mineraliensammlung/
├── 📁 public/              # Frontend-Dateien
│   └── index.html          # Haupt-Web-Interface
├── 📁 uploads/             # Mineral-Bilder
├── 📁 logs/                # PM2 Log-Dateien
├── 📄 server.js            # Express.js Server
├── 📄 ecosystem.config.js  # PM2 Konfiguration
├── 📄 package.json         # NPM Dependencies
├── 📄 minerals.db          # SQLite Datenbank
└── 📄 README.md            # Diese Datei
```

## 🛠️ Technologie Stack

<div align="center">

| **Backend** | **Frontend** | **Database** | **Tools** |
|-------------|--------------|--------------|-----------|
| ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white) | ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white) | ![SQLite](https://img.shields.io/badge/SQLite-07405E?style=flat&logo=sqlite&logoColor=white) | ![PM2](https://img.shields.io/badge/PM2-2B037A?style=flat&logo=pm2&logoColor=white) |
| ![Express.js](https://img.shields.io/badge/Express.js-404D59?style=flat&logo=express&logoColor=white) | ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white) | - | ![Sharp](https://img.shields.io/badge/Sharp-99CC00?style=flat&logo=sharp&logoColor=white) |
| ![Multer](https://img.shields.io/badge/Multer-FF6B6B?style=flat) | ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black) | - | ![Nodemon](https://img.shields.io/badge/Nodemon-76D04B?style=flat&logo=nodemon&logoColor=white) |

</div>

### 🎨 Design Principles

- **🌈 Gradient Magic**: Moderne CSS-Gradients für visuellen Appeal
- **💫 Smooth Animations**: Fließende Übergänge und Hover-Effekte
- **📱 Mobile First**: Responsive Design von Grund auf
- **🎯 User Experience**: Intuitive Navigation und klare Hierarchie

## 📋 API Dokumentation

### 🔍 **GET** `/api/minerals`
```javascript
// Alle Mineralien abrufen (mit optionalen Filtern)
GET /api/minerals?color=rot&location=deutschland&sortBy=name
```

### ➕ **POST** `/api/minerals`
```javascript
// Neues Mineral hinzufügen
POST /api/minerals
Content-Type: multipart/form-data
```

### ✏️ **PUT** `/api/minerals/:id`
```javascript
// Mineral bearbeiten
PUT /api/minerals/123
Content-Type: multipart/form-data
```

### 🗑️ **DELETE** `/api/minerals/:id`
```javascript
// Mineral löschen
DELETE /api/minerals/123
```

### 📊 **GET** `/api/stats`
```javascript
// Sammlungs-Statistiken
GET /api/stats
```

## 🎛️ Konfiguration

### PM2 Ecosystem

```javascript
// ecosystem.config.js
{
  name: 'mineraliensammlung',
  instances: 1,
  autorestart: true,
  max_memory_restart: '1G',
  cron_restart: '0 3 * * *'  // Täglicher Neustart um 3 Uhr
}
```

### Umgebungsvariablen

```bash
NODE_ENV=production
PORT=8084
MAX_FILE_SIZE=10485760  # 10MB
IMAGE_QUALITY=85        # JPEG Qualität
```

## 🐛 Troubleshooting

<details>
<summary>🔧 <strong>Häufige Probleme & Lösungen</strong></summary>

### Server startet nicht

```bash
# Port prüfen
lsof -i :8084

# PM2 Logs anzeigen
pm2 logs mineraliensammlung

# Neustart
pm2 restart ecosystem.config.js
```

### Bilder werden nicht geladen

```bash
# Berechtigungen prüfen
ls -la uploads/

# Ordner-Berechtigungen setzen
chmod 755 uploads/
```

### Datenbank-Fehler

```bash
# Datenbank-Datei prüfen
file minerals.db

# Backup erstellen
cp minerals.db minerals.db.backup
```

</details>

## 🚧 Roadmap

- [ ] 🎯 **v2.0** - Batch-Import für CSV-Dateien
- [ ] 🔐 **v2.1** - Benutzer-Authentifizierung
- [ ] 📱 **v2.2** - PWA-Unterstützung
- [ ] 🌍 **v2.3** - Multi-Sprachen-Support
- [ ] 📈 **v2.4** - Erweiterte Analytics
- [ ] 🎨 **v2.5** - Themes & Dark Mode
- [ ] 🔄 **v3.0** - Cloud-Synchronisation (optional)

## 🤝 Contributing

Ihre Beiträge sind willkommen! So können Sie helfen:

1. **🍴 Fork** das Repository
2. **🌿 Branch** erstellen (`git checkout -b feature/AmazingFeature`)
3. **💻 Commit** Ihre Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. **📤 Push** zum Branch (`git push origin feature/AmazingFeature`)
5. **📨 Pull Request** öffnen

### 🎨 Entwickler-Guidelines

- Verwenden Sie **deutsche Kommentare** für Konsistenz
- Folgen Sie dem bestehenden **Code-Style**
- **Testen** Sie auf Raspberry Pi vor dem PR
- Dokumentieren Sie neue **API-Endpoints**

## 📄 Lizenz

Dieses Projekt steht unter der **MIT License**. Siehe [LICENSE](LICENSE) für Details.

```
MIT License - Frei wie ein Vogel, stark wie ein Diamant 💎
```

## 🙏 Danksagungen

- **🍓 Raspberry Pi Foundation** - Für die großartige Hardware
- **⚡ Express.js Team** - Für das fantastische Framework
- **🖼️ Sharp Team** - Für die blitzschnelle Bildverarbeitung
- **🗃️ SQLite Team** - Für die zuverlässige Datenbank

---

<div align="center">

### 💝 Hat Ihnen das Projekt gefallen?

[![Star](https://img.shields.io/badge/⭐_Star-this_repo-yellow?style=for-the-badge)](https://github.com/IhrUsername/mineraliensammlung)
[![Fork](https://img.shields.io/badge/🍴_Fork-this_repo-blue?style=for-the-badge)](https://github.com/IhrUsername/mineraliensammlung/fork)
[![Follow](https://img.shields.io/badge/👤_Follow-@IhrUsername-purple?style=for-the-badge)](https://github.com/Its_Maeae)

**Erstellt mit 💎 für Mineralien-Liebhaber**

---

*"In jedem Stein steckt ein Universum - wir helfen Ihnen dabei, es zu entdecken."*

</div>