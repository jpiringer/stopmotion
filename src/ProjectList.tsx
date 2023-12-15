import * as React from "react"
import {useState} from "react"
import { Alert, ListGroup } from 'react-bootstrap'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "./models/db"
import ProjectItem from "./models/ProjectItem"
import { Project, FrameSize } from "./Project"

export function ProjectList({selected, onSelect, onOpen, onDelete}) {
	const projects = useLiveQuery(() => db.getProjects())
	const [showClearAlert, setShowClearAlert] = useState(false)

	if (!projects) {
		return null
	}

	return (
		projects.map((projectItem: ProjectItem, index: number) => {
			return (
				(showClearAlert && selected === index) ?
				 <Alert show key={-1} variant="danger">
            <Alert.Heading>
							Delete Project "{projectItem.title}"?
						</Alert.Heading>
            <p>
              Do you really want to delete the project "{projectItem.title}"? This cannot be undone!
            </p>
            <hr />
            <div className="d-flex justify-content-end">
              <Button onClick={() => {onDelete(projectItem.id); setShowClearAlert(false)}} variant="outline-danger">Delete Permanently</Button>{' '}
              <Button onClick={() => {setShowClearAlert(false)}} variant="outline-success">Cancel</Button>
            </div>
          </Alert>
					:
					<ListGroup.Item 
						as="li" 
						key={index}
						action 
						active={selected === index}
						onClick={() => {onSelect(index)}} 
						onDoubleClick={() => {onOpen(index)}}>
						{projectItem.title} 
						<button className="inline-project-button" onClick={() => {setShowClearAlert(true)}}>
							<i className="bi bi-trash3"></i>
						</button>
					</ListGroup.Item>)
		})
	)
}