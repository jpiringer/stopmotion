import Webcam from "react-webcam"
import React, { Component, MouseEvent, ChangeEvent } from 'react'
import { Col, Form, ListGroup } from 'react-bootstrap'
import { createGIF } from 'gifshot'

import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import Offcanvas from 'react-bootstrap/Offcanvas'
import ProgressBar from 'react-bootstrap/ProgressBar'

import { Project, FrameSize } from "./Project"
import ProjectItem from "./models/ProjectItem"

import FrameCanvas from "./FrameCanvas"
import { ProjectList } from "./ProjectList";
import { db } from "./models/db"

import exportVideo from "./exportVideo"

import { Jimp as JimpType, JimpConstructors } from '@jimp/core'
import 'jimp'

declare const Jimp: JimpType & JimpConstructors

const camFactor = 0.3

const possibleFrameRates = [10, 15, 30]

const possibleRotations = [0, 90, 180 , 270]

type ExportType = "Video" | "GIF" | "JSON"

const possibleSizes = [
  {width: 1920, height: 1080},
  {width: 1280, height: 720},
  {width: 1080, height: 1920},
  {width: 720, height: 1080}
]

interface SnapState {
  progress: number
  selectedFrameIndex: number
  showClearAlert: boolean
  showSettings: boolean
  showExport: boolean
  showInfo: boolean
  showProjectManager: boolean
  inputDevices: MediaDeviceInfo[]
  selectedDeviceID: string
  frameRate: number
  sizeIndex: number
  mirror: boolean
  rotate: number
  exportType: ExportType
  playing: boolean
  selectedProjectNr: number
  currentProject?: Project
  frames: string[]
}
 
interface SnapProps {
}

export class SnapCam extends Component<SnapProps, SnapState> {
  private camRef: React.RefObject<Webcam>;
  private mainDivRef: React.RefObject<HTMLDivElement>;

  setLocalStorage(key: string, value: any) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  getLocalStorage<T>(key: string, defaultValue: T): T {
    let storedValue = localStorage.getItem(key);
    if (storedValue == null) {
      this.setLocalStorage(key, defaultValue);
      return defaultValue;
    }
    return JSON.parse(storedValue);
  }

  getProjects() {
    return db.getProjects()
  }

  getCurrentProject() {
    return this.state.currentProject //this.state.projects[this.state.currentProjectNr];
  }

  openProjectNr(projectIndex: number) {
    db.getProjects().then(
      (projects: ProjectItem[]) => {
        let project = projects[this.state.selectedProjectNr] as Project
        project.setUpdater(() => {this.updateProject()})
        this.setState({currentProject: project})
        project.loadFrames().then((frames) => {
          this.setState({frames: frames.map((value) => {
            return value.content
          })})
        })
      }
    )
  }

  updateProject() {
    this.setState({currentProject: this.state.currentProject})
  }

  createNewProject() {
    return new Project(() => {this.updateProject()}, this.state.frameRate, possibleSizes[this.state.sizeIndex], this.state.mirror, this.state.rotate)
  }

  makeNewProject() {
    var newProject = this.createNewProject()

    this.setState({currentProject: newProject, frames: []})
  }

  constructor(props: SnapProps) {
    super(props);

    this.camRef = React.createRef();
    this.mainDivRef = React.createRef();

    let sizeIndex = this.getLocalStorage<number>("sizeIndex", 0)

    let frameRate = this.getLocalStorage<number>("frameRate", possibleFrameRates[1])
    let mirror = this.getLocalStorage<boolean>("mirror", false)
    let rotate = this.getLocalStorage<number>("rotate", 0)

    db.getProjectCount().then((count: number) => {
      if (count <= 0) {
        db.populate()
      }
    })

    db.projects.mapToClass(Project)

    this.state = {
      playing: false,
      progress: 0, 
      selectedFrameIndex: -1, 
      showClearAlert: true, showSettings: false, showExport: false, showProjectManager: false,
      showInfo: false,
      inputDevices: [], 
      selectedDeviceID: this.getLocalStorage<string>("selectedDeviceID", ""),
      frameRate: frameRate, 
      sizeIndex: sizeIndex,
      mirror: mirror,
      rotate: rotate,
      exportType: "GIF",
      selectedProjectNr: -1,
      currentProject: undefined,
      frames: []
    };

    this.snap = this.snap.bind(this)
    this.doExport = this.doExport.bind(this)
    this.showExport = this.showExport.bind(this)
    this.hideExport = this.hideExport.bind(this)
    this.deleteLast = this.deleteLast.bind(this)
    this.deleteSelected = this.deleteSelected.bind(this)
    this.duplicateSelected = this.duplicateSelected.bind(this)
    this.clear = this.clear.bind(this);
    this.keyDown = this.keyDown.bind(this);
    this.play = this.play.bind(this);
    this.selectFrame = this.selectFrame.bind(this);
    this.hideClearAlert = this.hideClearAlert.bind(this);
    this.showClearAlert = this.showClearAlert.bind(this);
    this.changeDevice = this.changeDevice.bind(this);
    this.changeFrameRate = this.changeFrameRate.bind(this);
    this.showSettings = this.showSettings.bind(this);
    this.handleCloseSettings = this.handleCloseSettings.bind(this);
    this.changeSize = this.changeSize.bind(this);
    this.changeMirror = this.changeMirror.bind(this);
    this.changeRotation = this.changeRotation.bind(this);
    this.onExportTypeChange = this.onExportTypeChange.bind(this);
    this.drawFrame = this.drawFrame.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    this.makeNewProject = this.makeNewProject.bind(this);
    this.makeNewProject = this.makeNewProject.bind(this);
    this.onProjectNameChange = this.onProjectNameChange.bind(this);
    this.showProjectManager = this.showProjectManager.bind(this);
    this.hideProjectManager = this.hideProjectManager.bind(this);

    window.addEventListener("beforeunload", this.handleBeforeUnload);
  }

  getFrames() {
    if (this.getCurrentProject() !== undefined) {
      if (this.state.frames === undefined) {
        return []
      }
      return this.state.frames 
    }
    else {
      return []
    }
  }

  getFrame(nr: number) {
    if (this.getCurrentProject() !== undefined) {
      return this.state.frames[nr]
    }
    return ""
  }

  handleBeforeUnload(event: Event) {
    event.preventDefault();
  }

  updateCameraList() {
    navigator.mediaDevices.enumerateDevices().then(devices => {this.setState({inputDevices: devices.filter(({ kind }) => kind === "videoinput")})});
  }

  componentWillUnmount(): void {
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
  }

  componentDidMount() {
    this.mainDivRef.current && this.mainDivRef.current.focus();

    navigator.mediaDevices.getUserMedia({"video": true}).then(stream => 
      this.updateCameraList()
    );

    navigator.mediaDevices.addEventListener('devicechange', event => {
      this.updateCameraList();
    });
  }

  rotate(base64str: string, angle: number, func: (src: string) => void) {
    Jimp.read(base64str).then((image: JimpType) => {
      image.rotate(angle, function(err: Error) {
        if (err) {
          throw err;
        }
      })
      .getBase64(Jimp.MIME_JPEG, function (err: Error, src: string) {
        func(src);
      });
    })  
  }

  snap() {
    if (this.camRef.current !== null && this.getCurrentProject() !== undefined) {
      const dimension = {width: this.getCurrentProject()!.getSize().width, height: this.getCurrentProject()!.getSize().height}
      const captured = this.camRef.current.getScreenshot(dimension);
      let storeImage = (img: string) => {
        let frames = this.state.frames

        frames.push(img)
        this.setState({frames: frames})
        this.getCurrentProject()!.addFrame(img);
      }

      if (captured !== null) {
        if (this.getCurrentProject()!.getRotate()) {
          this.rotate(captured, this.getCurrentProject()!.getRotate(), storeImage);
        }
        else {
          storeImage(captured);
        }
      }
      else {
        console.log("capture returned null!");
      }

      this.deselectFrame();
      this.skipEnd();
    }
  }

  setProgress(progress: number) {
    let prog = Math.trunc(progress * 10) / 10;
    this.setState({progress: prog});
  }

  exportGIF(fileName: string) {
    const options = {
      images: this.getFrames(),
      gifWidth: 500,
      gifHeight: 300,
      numWorkers: 5,
      frameDuration: 10 / this.getCurrentProject()!.getFramerate(),
      sampleInterval: 10,
      progressCallback: (e: number) => this.setProgress(e * 100)
    };

    createGIF(options, (obj: { error: any; image: string; }) => {
      if (!obj.error) {
        const link = document.createElement('a');
        link.download = fileName+".gif";
        link.href = obj.image;
        link.click();
        this.setProgress(0);
      }
    });
  }

  exportJSON(fileName: string) {
    let jsonString = this.getCurrentProject()!.exportToJSON(this.state.frames)

    const file = new Blob([jsonString], { type: 'text/plain' })
    const link = document.createElement('a')
    link.download = fileName+".json"
    link.href = URL.createObjectURL(file)
    link.click()
    this.setProgress(0)
    URL.revokeObjectURL(link.href)
  }

  exportVideo(fileName: string) {
    if (this.getCurrentProject() !== undefined) {
      exportVideo(fileName, this.getFrames(), this.getCurrentProject()!.getFramerate(), this.getCurrentProject()!.getSize().width, this.getCurrentProject()!.getSize().height, (e: number) => this.setProgress(e * 100));
    }
  }

  doExport() {
    if (this.state.exportType === "GIF") {
      this.exportGIF(this.getCurrentProject()!.getTitle())
    }
    else if (this.state.exportType === "JSON") {
      this.exportJSON(this.getCurrentProject()!.getTitle())
    }
    else {
      this.exportVideo(this.getCurrentProject()!.getTitle())
    }
  }

  deselectFrame() {
    this.setState({selectedFrameIndex: -1})
  }

  isSelected() {
    return this.state.selectedFrameIndex >= 0
  }

  selectFrame = (index: number) => (event: MouseEvent<HTMLImageElement>) => {  
    if (this.state.selectedFrameIndex === index) {
      this.deselectFrame()
    }
    else {
      this.setState({selectedFrameIndex: index})
    }
  }

  changeSelected(inc: number) {
    if (this.hasContent()) {
      let newIndex = this.isSelected() ? this.state.selectedFrameIndex + inc : this.getFrames().length-1

      if (newIndex < 0) {
        newIndex = 0
      }
      if (newIndex >= this.getFrames().length) {
        newIndex = this.getFrames().length-1
      }
      this.setState({selectedFrameIndex: newIndex})
    }
  }

  deleteLast() {
    if (this.getCurrentProject() !== undefined) {
      let frames = this.state.frames

      frames.pop()
      this.setState({frames: frames})
      this.getCurrentProject()!.deleteLastFrame()
      this.deselectFrame()
    }
  }

  deleteSelected() {
    if (this.getCurrentProject() !== undefined) {
      let frames = this.state.frames
   		frames.splice(this.state.selectedFrameIndex, 1)

      this.setState({frames: frames})
      this.getCurrentProject()!.deleteFrame(this.state.selectedFrameIndex)
      this.deselectFrame();
    }
  }

  duplicateSelected() {
    if (this.getCurrentProject() !== undefined) {
      let frames = this.state.frames
      let frame = frames[this.state.selectedFrameIndex]

      frames.push(frame)

      this.setState({frames: frames})
      this.getCurrentProject()!.addFrame(frame)
    }
  }

  hasContent() {
    if (this.getCurrentProject() !== undefined) {
      return this.getCurrentProject()!.hasContent();
    }
    else {
      return false;
    }
  }

  clear() {
    this.setState({showClearAlert: true});
  }

  play() {
    this.setState({playing: !this.state.playing});
  }

  skipEnd() {
    const element = document.getElementById("reel");

    if (element !== null) {
      element.scrollLeft = element.scrollWidth;
    }
  }

  skipStart() {
    const element = document.getElementById("reel");

    if (element !== null) {
      element.scrollLeft = -element.scrollWidth;
    }
  }

  noModals() {
    return !(this.state.showProjectManager || this.state.showExport || this.state.showSettings);
  }

  keyDown(e: { key: string; code: string; }) {
    if (this.noModals()) {
      if (e.code === "Enter") {
        this.snap();
      }
      else if (e.code === "Space") {
        this.play();
      }
      else if (e.code === "ArrowRight") {
        this.changeSelected(1);
      }
      else if (e.code === "ArrowLeft") {
        this.changeSelected(-1);
      }
      else if (e.code === "Delete" || e.code === "Backspace") {
        if (this.isSelected()) {
          this.deleteSelected();
        }
        else {
          this.deleteLast();
        }
      }
      else {
        //console.log('onKeyDown:', e.key, e.code);
      }
    }
  }

  hideClearAlert() {
    this.setState({showClearAlert: false});
  }

  showClearAlert() {
    this.setState({showClearAlert: true});
  }

  handleCloseSettings() {
    this.setState({showSettings: false});
  }

  showSettings() {
    this.setState({showSettings: true});
  }

  changeDevice(event: ChangeEvent<HTMLSelectElement>) {
    let deviceID = event.target.value;
    this.setLocalStorage("selectedDeviceID", deviceID);
    this.setState({selectedDeviceID: deviceID});
  }

  deviceSelector() {
    return (
      <Form.Select aria-label="select camera" value={this.state.selectedDeviceID} onChange={this.changeDevice}>
        {this.state.inputDevices.map((device: MediaDeviceInfo, index: number) => {
          return <option value={device.deviceId} key= {device.deviceId}>{device.label}</option>
        })}
      </Form.Select>
    );
  }

  changeFrameRate(event: ChangeEvent<HTMLSelectElement>) {
    let frameRate = parseInt(event.target.value)
    if (this.getCurrentProject() !== undefined) {
      this.getCurrentProject()!.setFrameRate(frameRate)
    }
    this.setLocalStorage("frameRate", frameRate)
    this.setState({frameRate: frameRate})
  }

  frameRateSelector() {
    return (
      <Form.Select aria-label="select frame rate" value={this.getCurrentProject()!.getFramerate()} onChange={this.changeFrameRate}>
        {possibleFrameRates.map((frameRate: number) => {
          return <option value={frameRate} key= {frameRate}>{frameRate}</option>
        })}
      </Form.Select>
    );
  }

  changeSize(event: ChangeEvent<HTMLSelectElement>) {
    let sizeIndex = parseInt(event.target.value);

    let width = possibleSizes[sizeIndex].width
    let height = possibleSizes[sizeIndex].height

    this.getCurrentProject()!.setSize({width: width, height: height})
    this.setLocalStorage("sizeIndex", sizeIndex);
    this.setState({sizeIndex: sizeIndex});
  }

  getSizeIndex() {
    let size = this.getCurrentProject()!.getSize()

    for (let [index, sz] of Object.entries(possibleSizes)) {
      if (sz.width === size.width) {
        return index
      }
    }

    return 0
  }

  sizeSelector() {
    return (
      <Form.Select aria-label="select frame rate" value={this.getSizeIndex()} onChange={this.changeSize}>
        {possibleSizes.map((size: FrameSize, index: number) => {
          let sizeLabel = size.width+"x"+size.height;
          return <option value={index} key={sizeLabel}>{sizeLabel}</option>
        })}
      </Form.Select>
    );
  }

  changeMirror() {
    let newValue = !this.state.mirror
    if (this.getCurrentProject() !== undefined) {
      this.getCurrentProject()!.setMirror(newValue)
    }
    this.setLocalStorage("mirror", newValue);
    this.setState({mirror: newValue});
  }

  changeRotation(event: ChangeEvent<HTMLSelectElement>) {
    let rotation = parseInt(event.target.value)

    if (this.getCurrentProject() !== undefined) {
      this.getCurrentProject()!.setRotate(rotation)
    }
    this.setLocalStorage("rotate", rotation);
    this.setState({rotate: rotation});
  }

  rotationSelector() {
    return (
      <Form.Select aria-label="select rotation" value={this.getCurrentProject()!.getRotate()} onChange={this.changeRotation}>
        {possibleRotations.map((rotation: number) => {
          return <option value={rotation} key={rotation}>{rotation}°</option>
        })}
      </Form.Select>
    );
  }



  onProjectNameChange(event: ChangeEvent<HTMLInputElement>) {
    if (this.getCurrentProject() !== undefined) {
      this.getCurrentProject()!.setTitle(event.target.value)
    }
  }

  settings() {
    return (
    <Offcanvas show={this.state.showSettings} onHide={this.handleCloseSettings}>
      <Offcanvas.Header closeButton closeVariant="white">
        <Offcanvas.Title>Settings</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        { this.getCurrentProject() !== undefined && 
          <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
            <Form.Label>Project title:</Form.Label>
            <Form.Control type="input" placeholder="project title" value={this.getCurrentProject()!.getTitle()} onChange={this.onProjectNameChange}/>
          </Form.Group>
        }
        Choose camera:
        { this.deviceSelector() }
        Frame rate:
        { this.frameRateSelector() }
        Size:
        { this.sizeSelector() }
        Rotation:
        { this.rotationSelector() }
        <Form.Check type="checkbox" id="mirror" label="Mirror" checked={this.getCurrentProject()!.getMirror()} onChange={this.changeMirror}/>
        {/*<Form.Check type="checkbox" id="rotate" label="Rotate 180°" checked={this.getCurrentProject()!.getRotate()} onChange={this.changeRotate} />*/}

      </Offcanvas.Body>
    </Offcanvas>
    );
  }

  openProject() {
    //this.setState({currentProjectNr: this.state.selectedProjectNr})
    this.openProjectNr(this.state.selectedProjectNr)
    this.hideProjectManager()
  }

  deleteProject(id: number) {
    var current = this.getCurrentProject()

    if (current !== undefined) {
      if (current.id === id) {
        this.setState({currentProject: undefined})
      }
    }

    db.deleteProject(id)
  }

  projectManager() {
    return (
      <Modal show={this.state.showProjectManager} onHide={this.hideProjectManager} animation={true}>
        <Modal.Header closeButton className="blackmodal" closeVariant="white">
          <Modal.Title>Project Manager</Modal.Title>
        </Modal.Header>
        <ListGroup as="ul">
          <ProjectList 
            selected={this.state.selectedProjectNr} 
            onSelect={(index: number) => {this.setState({selectedProjectNr: index})}}
            onOpen={() => {this.openProject()}}
            onDelete={(index: number) => {this.deleteProject(index)}}
          />
        </ListGroup>
        
        <Modal.Footer className="blackmodal">
            <Col>
              <Button variant="primary" onClick={() => {this.makeNewProject(); this.hideProjectManager();}}>New Project</Button>
            </Col>
            <Col>
              <Button variant="success" disabled={this.state.selectedProjectNr < 0} onClick={() => {this.openProject()}}>Open Project</Button>{' '}
              
              <Button variant="primary" onClick={this.hideProjectManager}>Cancel</Button>
            </Col>
        </Modal.Footer>
      </Modal>
    )
  }

  showProjectManager() {
    this.setState({showProjectManager: true, selectedProjectNr: -1, showClearAlert: false});
  }

  hideProjectManager() {
    this.setState({showProjectManager: false, showClearAlert: false});
  }

  showExport() {
    this.setState({showExport: true});
  }

  hideExport() {
    this.setState({showExport: false});
  }

  onExportTypeChange(event: ChangeEvent<HTMLInputElement>) {
    this.setState({exportType: event.target.value as ExportType});
  }

  export() {
    return (
      <Modal show={this.state.showExport} onHide={this.hideExport} animation={true}>
        <Modal.Header closeButton className="blackmodal" closeVariant="white">
          <Modal.Title>Export</Modal.Title>
        </Modal.Header>
        <Modal.Body className="blackmodal">
          <Form>
            <div className="mb-3">
              <Form.Check inline label="Video" value="Video" name="group1" type="radio" checked={this.state.exportType === "Video"} onChange={this.onExportTypeChange} id="video" />
              <Form.Check inline label="GIF" value="GIF" name="group1" type="radio" checked={this.state.exportType === "GIF"} onChange={this.onExportTypeChange} id="gif" />
              <Form.Check inline label="JSON" value="JSON" name="group1" type="radio" checked={this.state.exportType === "JSON"} onChange={this.onExportTypeChange} id="json" />
            </div>
          </Form>
          
          {this.state.progress !== 0 && <ProgressBar now={this.state.progress} label={`${this.state.progress}%`} />}

        </Modal.Body>
        <Modal.Footer className="blackmodal">
          <Button variant="success" onClick={this.doExport}>
            Export
          </Button>
          <Button variant="primary" onClick={this.hideExport}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  info() {
    return (
      <Modal show={this.state.showInfo} onHide={() => {this.setState({showInfo: false})}} animation={true}>
      <Modal.Header closeButton className="blackmodal" closeVariant="white">
          <Modal.Title>Info</Modal.Title>
        </Modal.Header>
        <Modal.Body className="blackmodal">
          <p>This is a cute stop motion app by jörg piringer</p>
          <p>check out my website: <a href="https://joerg.piringer.net">https://joerg.piringer.net</a></p>
          <p>or fork this app on github: <a href="https://github.com/jpiringer/stopmotion">https://github.com/jpiringer/stopmotion</a></p>
        </Modal.Body>
        <Modal.Footer className="blackmodal">
          <Button variant="primary" onClick={() => {this.setState({showInfo: false})}}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    )
  }

  drawFrame(context: CanvasRenderingContext2D, frameCount: number) {
    let imageSrc = this.getFrame(frameCount % this.getFrames().length);
    var image = new Image();
    image.src = imageSrc;
    context.drawImage(image, 0, 0, context.canvas.width, context.canvas.height);
  }

  frame() {
    return (
      this.state.playing ?
      <FrameCanvas 
        width={this.getCurrentProject()!.getSize().width*camFactor} 
        height={this.getCurrentProject()!.getSize().height*camFactor} 
        draw={this.drawFrame} 
        frameRate={this.getCurrentProject()!.getFramerate()} 
      />
      :
      <Webcam 
        mirrored={this.getCurrentProject()!.getMirror()} 
        width={this.getCurrentProject()!.getSize().width*camFactor} height={this.getCurrentProject()!.getSize().height*camFactor} 
        audio={false} 
        screenshotFormat="image/jpeg" 
        videoConstraints={ {deviceId: this.state.selectedDeviceID, width: this.getCurrentProject()!.getSize().width, height: this.getCurrentProject()!.getSize().height} } 
        ref={this.camRef} 
        style={{transform: "rotate("+this.getCurrentProject()!.getRotate()+"deg)"}}
        />
    );
  }

  render() {
    return (
      <div className="camMain" tabIndex={0} onKeyDown={this.keyDown} ref={this.mainDivRef}>
        { this.getCurrentProject() !== undefined && this.settings() }
        <br />
        <div className="heading">
          <span className="projectTitle">{ this.getCurrentProject() === undefined ? "please create or load a project!" : this.getCurrentProject()!.getTitle() }</span>
          { this.getCurrentProject() !== undefined && <Button variant="outline-danger" onClick={this.showSettings}><i className="bi bi-gear"></i></Button> }{' '} 
        </div>
        <div>
          { this.getCurrentProject() !== undefined && this.frame() }
          <br />
          { this.getCurrentProject() !== undefined && <>
            <Button variant="outline-primary" onClick={this.snap}><i className="bi bi-camera"></i></Button>{' '}
            <Button variant="outline-danger" onClick={this.deleteLast} disabled={!this.hasContent()}><i className="bi bi-backspace"></i></Button>{' '}
            <Button variant="outline-danger" onClick={this.deleteSelected} disabled={!this.isSelected()}>Delete Selected</Button>{' '}
            <Button variant="outline-primary" onClick={this.duplicateSelected} disabled={!this.isSelected()}><i className="bi bi-copy"></i></Button>
          </> }
          <br />
        </div>
        <br />
        { this.getCurrentProject() !== undefined && <div>
          <div className="reel" id="reel">
            <div className="reelStart">{' '}</div>
            { this.getCurrentProject() !== undefined && this.getFrames().map((source: string, index: number) => {
              return <div>
                <div className="frameNumber">
                  {index+1}
                </div>
                <img src={source} className={(this.state.selectedFrameIndex === index ? "snap selectedSnap" : "snap")} alt="captured" key={"snap"+index} id={"snap"+index} onClick={this.selectFrame(index)}/>
              </div>;
            }
            )}
            
            <div>
              <div className="frameNumber">
                
              </div>
              <div className="snap takeSnap" key={"empty"} id={"empty"} onClick={this.snap}>
                <svg xmlns="http://www.w3.org/2000/svg" height="100%" fill="currentColor" className="bi bi-camera" viewBox="0 0 16 16">
                  <path d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4z"/>
                  <path d="M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5m0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M3 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"/>
                </svg>
              </div>
            </div>
          </div>
          <br />
          <Button variant="outline-success" onClick={this.skipStart} disabled={!this.hasContent()}><i className="bi bi-skip-start"></i></Button>{' '}
          <Button variant="outline-success" onClick={this.play} disabled={!this.hasContent()}>{this.state.playing ? <i className="bi bi-stop"></i> : <i className="bi bi-play"></i>}</Button>{' '}
          <Button variant="outline-success" onClick={this.skipEnd} disabled={!this.hasContent()}><i className="bi bi-skip-end"></i></Button>
          <br />
        </div> }
        <br />
        <div>
          <Button variant="outline-success" onClick={this.showExport} disabled={!this.hasContent()}><i className="bi bi-box-arrow-down"></i></Button>{' '}
          <Button variant="outline-success" onClick={this.showProjectManager}>Manage Projects</Button>{' '}
          <Button variant="outline-success" onClick={() => {this.setState({showInfo: true})}} ><i className="bi bi-info-circle"></i></Button>
        </div>
        { this.export() }
        { this.projectManager() }
        { this.info() }
      </div>
    );
  };
}

export default SnapCam;