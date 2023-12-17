import { FrameSize } from "../Project"

export default interface ProjectItem {
  id?: number
  title: string
	frameRate: number
	size: FrameSize
	mirror: boolean
  rotate: number

	frameIds: number[]
}