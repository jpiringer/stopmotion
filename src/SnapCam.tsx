import Webcam from "react-webcam"
import React, { Component, MouseEventHandler, MouseEvent, ChangeEvent } from 'react'
import { Alert, Col, Form, ListGroup } from 'react-bootstrap'
import { createGIF } from 'gifshot'

import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import Offcanvas from 'react-bootstrap/Offcanvas'
import ProgressBar from 'react-bootstrap/ProgressBar'

import { Project, FrameSize } from "./Project"

import FrameCanvas from "./FrameCanvas"
import Database from "./Database"

import exportVideo from "./exportVideo"

import { Jimp as JimpType, JimpConstructors } from '@jimp/core'
import 'jimp'
//import Jimp from "jimp";

declare const Jimp: JimpType & JimpConstructors;

const camFactor = 0.3;

const possibleFrameRates = [10, 15, 30];

type ExportType = "Video" | "GIF";

const possibleSizes = [
  {width: 1920, height: 1080},
  {width: 1280, height: 720}
];

interface SnapState {
  progress: number
  selectedFrameIndex: number
  showClearAlert: boolean
  showSettings: boolean
  showExport: boolean
  showProjectManager: boolean
  inputDevices: MediaDeviceInfo[]
  selectedDeviceID: string
  frameRate: number
  sizeIndex: number
  mirror: boolean
  rotate: boolean
  exportType: ExportType
  exportFileName: string
  playing: boolean
  projects: Project[]
  selectedProjectNr: number
  currentProjectNr: number
}
 
interface SnapProps {
}

export class SnapCam extends Component<SnapProps, SnapState> {
  private camRef: React.RefObject<Webcam>;
  private canvasRef: React.RefObject<HTMLCanvasElement>;
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

  getCurrentProject() {
    return this.state.projects[this.state.currentProjectNr];
  }

  updateProject() {
    var newProject = this.getCurrentProject().clone()
    var projects = this.state.projects

    projects[this.state.currentProjectNr] = newProject
    this.setState({projects: projects})
  }

  createNewProject() {
    return new Project(() => {this.updateProject()}, this.state.frameRate, possibleSizes[this.state.sizeIndex], this.state.mirror, this.state.rotate)
  }

  makeNewProject() {
    var projects = this.state.projects
    var newProject = this.createNewProject()

    projects.push(newProject)
    newProject.activate()

    this.setState({projects: projects, currentProjectNr: projects.length-1})
  }

  constructor(props: SnapProps) {
    super(props);

    this.camRef = React.createRef();
    this.mainDivRef = React.createRef();
    this.canvasRef = React.createRef();

    let sizeIndex = this.getLocalStorage<number>("sizeIndex", 0)

    let frameRate = this.getLocalStorage<number>("frameRate", possibleFrameRates[1])
    let mirror = this.getLocalStorage<boolean>("mirror", false)
    let rotate = this.getLocalStorage<boolean>("rotate", false)
    let size = possibleSizes[sizeIndex]

    this.state = {
      playing: false,
      progress: 0, 
      selectedFrameIndex: -1, 
      showClearAlert: true, showSettings: false, showExport: false, showProjectManager: false,
      inputDevices: [], 
      selectedDeviceID: this.getLocalStorage<string>("selectedDeviceID", ""),
      frameRate: frameRate, 
      sizeIndex: sizeIndex,
      mirror: mirror,
      rotate: rotate,
      exportType: "GIF",
      exportFileName: "export",
      projects: [new Project(() => {this.updateProject()}, frameRate, size, mirror, rotate)],
      selectedProjectNr: -1,
      currentProjectNr: 0
    };

    this.snap = this.snap.bind(this);
    this.doExport = this.doExport.bind(this);
    this.showExport = this.showExport.bind(this);
    this.hideExport = this.hideExport.bind(this);
    this.deleteLast = this.deleteLast.bind(this);
    this.deleteSelected = this.deleteSelected.bind(this);
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
    this.changeRotate = this.changeRotate.bind(this);
    this.onExportTypeChange = this.onExportTypeChange.bind(this);
    this.onExportFileNameChange = this.onExportFileNameChange.bind(this);
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
    return this.getCurrentProject().getFrames()
  }

  getFrame(nr: number) {
    return this.getCurrentProject().getFrame(nr)
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
    console.log("base64: "+base64str);
    //const buf = Buffer.from(base64str, 'base64');
    Jimp.read(base64str).then((image) => {
      console.log("image: "+image)
      image.rotate(angle, function(err) {
        if (err) throw err;
      })
      .getBase64(Jimp.MIME_JPEG, function (err, src: string) {
        func(src);
      });
    })  
  }

  snap() {
    if (this.camRef.current !== null) {
      const dimension = {width: this.getCurrentProject().getSize().width, height: this.getCurrentProject().getSize().height}
      const captured = this.camRef.current.getScreenshot(dimension);
      let storeImage = (img: string) => {
        this.getCurrentProject().addFrame(img);
      }

      if (captured !== null) {
        if (this.getCurrentProject().getRotate()) {
          this.rotate(captured, 180, storeImage);
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
    //console.log(`progress: ${progress}`);
  }

  exportGIF(fileName: string) {
    const options = {
      images: this.getFrames(),
      gifWidth: 500,
      gifHeight: 300,
      numWorkers: 5,
      frameDuration: 10 / this.getCurrentProject().getFramerate(),
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

  exportVideo(fileName: string) {
    exportVideo(this.getFrames(), this.getCurrentProject().getFramerate(), this.getCurrentProject().getSize().width, this.getCurrentProject().getSize().height, (e: number) => this.setProgress(e * 100));
  }

  doExport() {
    if (this.state.exportType === "GIF") {
      this.exportGIF(this.state.exportFileName);
    }
    else {
      this.exportVideo(this.state.exportFileName);
    }
  }

  deselectFrame() {
    this.setState({selectedFrameIndex: -1});
  }

  isSelected() {
    return this.state.selectedFrameIndex >= 0;
  }

  selectFrame = (index: number) => (event: MouseEvent<HTMLImageElement>) => {  
    if (this.state.selectedFrameIndex === index) {
      this.deselectFrame();
    }
    else {
      this.setState({selectedFrameIndex: index});
    }
  }

  changeSelected(inc: number) {
    if (this.hasContent()) {
      let newIndex = this.isSelected() ? this.state.selectedFrameIndex + inc : this.getFrames().length-1;

      if (newIndex < 0) {
        newIndex = 0;
      }
      if (newIndex >= this.getFrames().length) {
        newIndex = this.getFrames().length-1;
      }
      this.setState({selectedFrameIndex: newIndex});
    }
  }

  deleteLast() {
    this.getCurrentProject().deleteLastFrame();
    this.deselectFrame();
  }

  deleteSelected() {
    this.getCurrentProject().deleteFrame(this.state.selectedFrameIndex);
    this.deselectFrame();
  }

  hasContent() {
    return this.getCurrentProject().hasContent();
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
    //console.log("new ID: "+deviceID);
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
    this.getCurrentProject().setFrameRate(frameRate)
    this.setLocalStorage("frameRate", frameRate)
    this.setState({frameRate: frameRate})
  }

  frameRateSelector() {
    return (
      <Form.Select aria-label="select frame rate" value={this.getCurrentProject().getFramerate()} onChange={this.changeFrameRate}>
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

    this.getCurrentProject().setSize({width: width, height: height})
    this.setLocalStorage("sizeIndex", sizeIndex);
    this.setState({sizeIndex: sizeIndex});
  }

  getSizeIndex() {
    let size = this.getCurrentProject().getSize()

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
    this.getCurrentProject().setMirror(newValue)
    this.setLocalStorage("mirror", newValue);
    this.setState({mirror: newValue});
  }

  changeRotate() {
    let newValue = !this.state.rotate;
    this.getCurrentProject().setRotate(newValue)
    this.setLocalStorage("rotate", newValue);
    this.setState({rotate: newValue});
  }

  onProjectNameChange(event: ChangeEvent<HTMLInputElement>) {
    this.getCurrentProject().setTitle(event.target.value);
  }

  settings() {
    return (
    <Offcanvas show={this.state.showSettings} onHide={this.handleCloseSettings}>
      <Offcanvas.Header closeButton closeVariant="white">
        <Offcanvas.Title>Settings</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
          <Form.Label>Project title:</Form.Label>
          <Form.Control type="input" placeholder="project title" value={this.getCurrentProject().getTitle()} onChange={this.onProjectNameChange}/>
        </Form.Group>
        Choose camera:
        { this.deviceSelector() }
        Frame rate:
        { this.frameRateSelector() }
        Size:
        { this.sizeSelector() }

        <Form.Check type="checkbox" id="mirror" label="Mirror" checked={this.getCurrentProject().getMirror()} onChange={this.changeMirror}/>
        <Form.Check type="checkbox" id="rotate" label="Rotate 180°" checked={this.getCurrentProject().getRotate()} onChange={this.changeRotate} />

      </Offcanvas.Body>
    </Offcanvas>
    );
  }

  openProject() {
    this.setState({currentProjectNr: this.state.selectedProjectNr});
    this.hideProjectManager();
  }

  deleteProject(nr: number) {
    console.log("delete: "+this.state.projects[nr].getTitle())
    var current = this.getCurrentProject()
    var projects = this.state.projects
    projects.splice(nr, 1)

    var currentIndex = -1;
    for (var i = 0; i < projects.length; i++) {
      if (current === projects[i]) {
        currentIndex = i
        break
      }
    }

    if (projects.length > 0) {
      if (currentIndex === -1) {
        currentIndex = (nr+1) % projects.length
      }
    }
    else {
      var newProject = this.createNewProject()
      projects = [newProject]
      newProject.activate()
      currentIndex = 0
    }
    this.setState({showClearAlert: false, projects: projects, currentProjectNr: currentIndex})
  }

  projectManager() {
    return (
      <Modal show={this.state.showProjectManager} onHide={this.hideProjectManager} animation={true}>
        <Modal.Header closeButton className="blackmodal" closeVariant="white">
          <Modal.Title>Project Manager</Modal.Title>
        </Modal.Header>
        <ListGroup as="ul">
          { this.state.projects.map((project: Project, index: number) => {
              return ((this.state.showClearAlert && this.state.selectedProjectNr === index) ?
                <Alert show variant="danger">
                  <Alert.Heading>Delete Project "{project.getTitle()}"?</Alert.Heading>
                  <p>
                  Do you really want to delete the project "{project.getTitle()}"? This cannot be undone!
                  </p>
                  <hr />
                  <div className="d-flex justify-content-end">
                  <Button onClick={() => {this.deleteProject(index)}} variant="outline-danger">Delete Permanently</Button>{' '}
                  <Button onClick={this.hideClearAlert} variant="outline-success">Cancel</Button>
                  </div>
                </Alert>
                :
                <ListGroup.Item as="li" action active={this.state.selectedProjectNr === index} onClick={() => {this.setState({selectedProjectNr: index})}} onDoubleClick={() => {this.openProject()}}>
                  {project.getTitle()} <button className="inline-project-button" onClick={this.showClearAlert}><i className="bi bi-trash3"></i></button>
                </ListGroup.Item>);
            })
          }
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

  onExportFileNameChange(event: ChangeEvent<HTMLInputElement>) {
    this.setState({exportFileName: event.target.value});
  }

  export() {
    return (
      <Modal show={this.state.showExport} onHide={this.hideExport} animation={true}>
        <Modal.Header closeButton className="blackmodal" closeVariant="white">
          <Modal.Title>Export</Modal.Title>
        </Modal.Header>
        <Modal.Body className="blackmodal">
          <Form>
            <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
              <Form.Label>File name</Form.Label>
              <Form.Control type="input" placeholder="export" value={this.state.exportFileName} onChange={this.onExportFileNameChange}/>
            </Form.Group>
            <div className="mb-3">
              <Form.Check inline label="Video" value="Video" name="group1" type="radio" checked={this.state.exportType === "Video"} onChange={this.onExportTypeChange} id="video" />
              <Form.Check inline label="GIF" value="GIF" name="group1" type="radio" checked={this.state.exportType === "GIF"} onChange={this.onExportTypeChange} id="gif" />
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
        width={this.getCurrentProject().getSize().width*camFactor} 
        height={this.getCurrentProject().getSize().height*camFactor} 
        draw={this.drawFrame} 
        frameRate={this.getCurrentProject().getFramerate()} />
      :
      <Webcam 
        mirrored={this.getCurrentProject().getMirror()} 
        width={this.getCurrentProject().getSize().width*camFactor} height={this.getCurrentProject().getSize().height*camFactor} 
        audio={false} 
        screenshotFormat="image/jpeg" 
        videoConstraints={ {deviceId: this.state.selectedDeviceID, width: this.getCurrentProject().getSize().width, height: this.getCurrentProject().getSize().height} } 
        ref={this.camRef} 
        style={this.getCurrentProject().getRotate() ? {transform: "rotate(180deg)"} : {}}
        />
    );
  }

  render() {
    return (
      <div className="camMain" tabIndex={0} onKeyDown={this.keyDown} ref={this.mainDivRef}>
        { this.settings() }
        <br />
        <div className="heading">
          <span className="projectTitle">{ this.getCurrentProject().getTitle() }</span>
          <Button variant="outline-danger" onClick={this.showSettings}><i className="bi bi-gear"></i></Button>{' '}
        </div>
        <div>
          { this.frame() }
          <br />
          <Button variant="outline-primary" onClick={this.snap}><i className="bi bi-camera"></i></Button>{' '}
          <Button variant="outline-danger" onClick={this.deleteLast} disabled={!this.hasContent()}><i className="bi bi-backspace"></i></Button>{' '}
          <Button variant="outline-danger" onClick={this.deleteSelected} disabled={!this.isSelected()}>Delete Selected</Button>
          <br />
        </div>
        <br />
        <div>
          <div className="reel" id="reel">
            <div className="reelStart">{' '}</div>
            {this.getFrames().map((source: string, index: number) => {
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
        </div>
        <br />
        <div>
          <Button variant="outline-success" onClick={this.showExport} disabled={!this.hasContent()}><i className="bi bi-box-arrow-down"></i></Button>{' '}
          <Button variant="outline-success" onClick={this.showProjectManager}>Manage Projects</Button>
        </div>
        { this.export() }
        { this.projectManager() }
      </div>
    );
  };
}

export default SnapCam;