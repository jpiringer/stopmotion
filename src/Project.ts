// Project

import adjectives from "./Adjectives"
import nouns from "./Nouns"
import { db } from "./models/db"
import ProjectItem from "./models/ProjectItem"

export interface FrameSize {
  width: number
  height: number
}

const getRandomWord = (array: string[]) => {
  return array[Math.floor(Math.random() * (array.length - 1))];
};

function generateTitle() {
	return getRandomWord(adjectives)+" "+getRandomWord(nouns);
}

export class Project implements ProjectItem {
	public id: number = -1

	title: string
	frameRate: number
	size: FrameSize
	mirror: boolean
  rotate: number
	frameIds: number[] = []

	protected updater: () => void

	constructor(updater: () => void, frameRate: number, size: FrameSize, mirror: boolean, rotate: number) {
		this.updater = updater
		this.frameRate = frameRate
		this.size = size
		this.mirror = mirror
		this.rotate = rotate

		this.title = generateTitle()
		this.frameIds = []

		db.addProject(this).then((value: number) => {this.id = value}, (error) => {})
	}

	clone() {
		var newProject = new Project(this.updater, this.frameRate, this.size, this.mirror, this.rotate)

		newProject.id = this.id
		newProject.title = this.title
		//newProject.frames = this.frames
		newProject.frameIds = this.frameIds
		
		return newProject
	}

	setUpdater(updater: () => void) {
		this.updater = updater
	}

	updateState() {
		db.updateProject(this)
		this.updater()
	}

	// id

	getId() {
		return this.id
	}

	// title

	setTitle(title: string) {
		this.title = title
		this.updateState()
	}

	getTitle() {
		return this.title
	}

	// frameRate

	setFrameRate(frameRate: number) {
		this.frameRate = frameRate
		this.updateState()
	}

	getFramerate() {
		return this.frameRate
	}

	// size

	setSize(size: FrameSize) {
		this.size = size
		this.updateState()
	}

	getSize() {
		return this.size
	}

	// mirror & rotate

	setMirror(mirror: boolean) {
		this.mirror = mirror
		this.updateState()
	}

	getMirror() {
		return this.mirror
	}

	setRotate(rotate: number) {
		this.rotate = rotate
		this.updateState()
	}

	getRotate() {
		return this.rotate
	}

	// frames

	hasContent() {
		if (this.frameIds === undefined) {
			return false
		}
		return this.frameIds.length > 0
	}

	getFrames() {
		return [] //this.frames
	}

	getFrame(nr: number) {
		return null //this.frames[nr]
	}

	addFrameId(frameId: number) {
		if (this.frameIds === undefined) {
			this.frameIds = []
		}
		this.frameIds.push(frameId)
	}

	addFrame(frame: string) {
		db.addFrame(this, frame).then((frameId: number) => {
			this.addFrameId(frameId)
			this.updateState()
		})	
	}

	async loadFrames() {
		return db.getFrames(this)
	}

	deleteFrameWithId(frameId: number | undefined) {
		if (frameId !== undefined) {
			db.deleteFrame(frameId).then(() => {
				this.updateState()
			})
		}
	}

	deleteLastFrame() {
		let frameId = this.frameIds.pop()

		this.deleteFrameWithId(frameId)
	}

	deleteFrame(nr: number) {
		let frameId = this.frameIds[nr]

		this.frameIds.splice(nr, 1)

		this.deleteFrameWithId(frameId)
	}

	getFrameIds() {
		return this.frameIds
	}

	exportToJSON(frames: string[]) {
		var json = {
			title: this.title,
			frameRate: this.frameRate,
			size: this.size,
			mirror: this.mirror,
  		rotate: this.rotate,
			frames: frames
		}

		let stringified = JSON.stringify(json)

		return stringified
	}
}

export default Project;