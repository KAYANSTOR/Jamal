# Architecture Decision Record (ADR): Local-First & Backup Strategy

## 1. Core Architecture: Local-First (PWA)
- **Primary Operation:** The system operates primarily as a Local-First Web App / PWA installed on the user's desktop.
- **Data Source:** Daily operations rely entirely on the local database (Dexie/IndexedDB).
- **Offline Capability:** The system must function completely without an internet connection.
- **Cloud Role:** The cloud backend is NOT the primary synchronous data source for daily tasks. It acts strictly as a secondary layer for cloud backups and disaster recovery.

## 2. Integrated Backup System
- **Official Integration:** The backup system must be a native, maintainable feature within the application's architecture (UI -> Service/UseCase -> LocalDB/FileSystem).
- **No External Scripts/EXEs:** No standalone executables or external temporary scripts will be used for backups or migrations.
- **Local Directory Selection:** The system will utilize the browser's **File System Access API** (e.g., `showDirectoryPicker()`) to allow the user to select a persistent local backup directory (e.g., `C:\Warehouse Backups`).
- **File Organization:** Backups must be generated as organized files with clear timestamps.
- **Automated Daily Local Backup:** 
  - On application startup, the system will check the last backup timestamp.
  - If > 24 hours have passed and directory permissions are granted/persisted, the system will automatically trigger a local backup.
- **On-Demand Backup:** Users can trigger a manual local backup at any time.
- **Cloud Backup:** A daily cloud backup will be synchronized as an additional layer of protection.
- **Restore (Recovery):** The application must natively support restoring the database from these backup files.

## 3. Strict Compliance Rule
- **NO TEMPORARY SCRIPTS:** Any future migrations, data processing, or backup handling must be officially built into the application's core codebase. Temporary "fix", "cleanup", or "one-time" scripts are strictly forbidden.
