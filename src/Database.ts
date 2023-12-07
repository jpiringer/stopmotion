import { Project, FrameSize } from "./Project"

class Database {
	static instance: Database

	databaseName = "stopmotion-db"
	databaseVersion = 1

	db: IDBDatabase | undefined = undefined

	static shared() {
		if (!Database.instance) {
			Database.instance = new Database()
		}
		return Database.instance
	}

	constructor() {
		Database.instance = this

		let request = indexedDB.open(this.databaseName, this.databaseVersion)

		request.onupgradeneeded = function(event: IDBVersionChangeEvent) {
			Database.shared().db = request.result

			let db = Database.shared().db
			if (db !== undefined) {
				let objectStore = db.createObjectStore("projects", { keyPath: "id" })
				objectStore.createIndex("projectNameIndex", "name", { unique: false })
			}
			else {
				console.log("could not upgrade database!")
			}
		};

		request.onsuccess = function(event: Event) {
			Database.shared().db = request.result
			// Database opened successfully
		};

		request.onerror = function(event: Event) {
			console.log(`error loading database "${Database.shared().databaseName}"`)
		};
	}

	storeProject(project: Project) {
		if (this.db !== undefined) {
			let transaction = this.db.transaction("projects", "readwrite");
			let objectStore = transaction.objectStore("project");

			let data = { id: 1, name: "John Doe", age: 25 };
			let addRequest = objectStore.add(data);

			addRequest.onsuccess = function(event: Event) {
				// Data added successfully
			};
		}
	}

	getProject(id: string) {
		if (this.db !== null) {
		}
	}
}

export default Database