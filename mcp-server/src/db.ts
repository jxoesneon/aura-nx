import fs from 'fs';
import path from 'path';

const dbPath = path.resolve(__dirname, '../fleet.json');

class Database {
  private data: any = { devices: [], telemetry: [] };

  constructor() {
    if (fs.existsSync(dbPath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      } catch (e) {
        this.data = { devices: [], telemetry: [] };
      }
    }
  }

  exec(query: string) {
    // Mock exec
  }

  prepare(query: string) {
    return {
      run: (...args: any[]) => {
        // Mock run
        this.save();
      },
      get: (...args: any[]) => {
        // Mock get
        return null;
      },
      all: (...args: any[]) => {
        // Mock all
        return [];
      }
    };
  }

  private save() {
    fs.writeFileSync(dbPath, JSON.stringify(this.data, null, 2));
  }
}

const db = new Database();
export default db;
