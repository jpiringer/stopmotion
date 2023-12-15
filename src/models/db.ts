// db.ts
import Dexie, { Table } from 'dexie';
import { Project } from "../Project"
import ProjectItem from "./ProjectItem"
import FrameItem from "./FrameItem"

export class StopMotionDB extends Dexie {
  projects!: Table<ProjectItem, number>;
  frames!: Table<FrameItem, number>;

  populate() {
    new Project(() => {}, 10, {width: 1920, height: 1080}, false, false)
  }

  constructor() {
    super('stopMotionDatabase');

    this.version(0.1).stores({
      projects: '++id', // Primary key and indexed props
      frames: '++id, projectId' // Primary key and indexed props
    })

    this.on("populate", this.populate)

    this.open()
  }

  deleteProject(projectId: number) {
    return this.transaction('rw', this.frames, this.projects, () => {
      this.frames.where({ projectId }).delete()
      this.projects.delete(projectId)
    })
  }

  async addProject(project: Project) {
    const id = await this.projects.add({
      title: project.getTitle(),
      frameRate: project.getFramerate(),
      mirror: project.getMirror(),
      rotate: project.getRotate(),
      size: project.getSize(),
      frameIds: project.getFrameIds()
    })

    return id
  }

  async updateProject(project: Project) {
    await this.projects.update(project.getId(), {
      title: project.getTitle(),
      frameRate: project.getFramerate(),
      mirror: project.getMirror(),
      rotate: project.getRotate(),
      size: project.getSize(),
      frameIds: project.getFrameIds()
    })
  }

  async addFrame(project: Project, frame: string) {
    const id = await this.frames.add({
      projectId: project.getId(),
      content: frame
    })

    return id
  }

  async deleteFrame(frameId: number) {
    return this.frames.delete(frameId)
  }

  async getFrames(project: Project) {
    let projectId = project.id
    return this.frames.where({ projectId }).toArray()
  }

  async getProjects() {
    return this.projects.toArray()
  }

  async getProjectCount() {
    return this.projects.count()
  }
}

export const db = new StopMotionDB()
