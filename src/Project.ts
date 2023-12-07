// Project

import adjectives from "./Adjectives"
import nouns from "./Nouns"

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

export class Project {
	protected title: string
	protected frameRate: number
	protected size: FrameSize
	protected mirror: boolean
  protected rotate: boolean

	protected frames: string[] = []

	protected updater: () => void

	constructor(updater: () => void, frameRate: number, size: FrameSize, mirror: boolean, rotate: boolean) {
		this.updater = updater
		this.frameRate = frameRate
		this.size = size
		this.mirror = mirror
		this.rotate = rotate

		this.title = generateTitle()
	}

	clone() {
		var newProject = new Project(this.updater, this.frameRate, this.size, this.mirror, this.rotate)
		
		return newProject
	}

	updateState() {
		this.updater()
	}

	store() {

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

	// frames

	getFrames() {
		return this.frames
	}

	addFrame(frame: string) {
		this.frames.push(frame)
		this.updateState()
	}

	deleteLastFrame() {
		this.frames = this.frames.slice(0, -1)
		this.updateState()
	}

	deleteFrameNr(nr: number) {
		this.frames.splice(nr, 1);
		this.updateState()
	}
}

export default Project;