import Webcam from "react-webcam";
import React, { Component, MouseEventHandler, ChangeEvent } from 'react';
import { Form, FormControlElement } from 'react-bootstrap';
import { createGIF } from 'gifshot';

import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Offcanvas from 'react-bootstrap/Offcanvas';
import ProgressBar from 'react-bootstrap/ProgressBar';

import { Project, FrameSize } from "./Project";

import FrameCanvas from "./FrameCanvas";

import exportVideo from "./exportVideo";

import { Jimp as JimpType, JimpConstructors } from '@jimp/core';
import 'jimp';

declare const Jimp: JimpType & JimpConstructors;

const camFactor = 0.3;

const possibleFrameRates = [10, 15, 30];

type ExportType = "Video" | "GIF";

const possibleSizes = [
  {width: 1920, height: 1080},
  {width: 1280, height: 720}
];

interface SnapState {
  snaps: string[]
  progress: number
  selectedFrameIndex: number
  showClearModal: boolean
  showSettings: boolean
  showExport: boolean
  inputDevices: MediaDeviceInfo[]
  selectedDeviceID: string
  frameRate: number
  sizeIndex: number
  snapWidth: number
  snapHeight: number
  mirror: boolean
  rotate: boolean
  exportType: ExportType
  exportFileName: string
  playing: boolean
  projects: Project[]
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

  makeNewProject() {
    var projects = this.state.projects
    var newProject = new Project(this.updateProject, this.state.frameRate, possibleSizes[this.state.sizeIndex], this.state.mirror, this.state.rotate)

    projects.push(newProject)

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
      snaps: [], 
      selectedFrameIndex: -1, 
      showClearModal: false, showSettings: false, showExport: false,
      inputDevices: [], 
      selectedDeviceID: this.getLocalStorage<string>("selectedDeviceID", ""),
      frameRate: frameRate, 
      sizeIndex: sizeIndex,
      snapWidth: size.width,
      snapHeight: size.height,
      mirror: mirror,
      rotate: rotate,
      exportType: "GIF",
      exportFileName: "export",
      projects: [new Project(this.updateProject, frameRate, size, mirror, rotate)],
      currentProjectNr: 0
    };

    this.snap = this.snap.bind(this);
    this.doExport = this.doExport.bind(this);
    this.showExport = this.showExport.bind(this);
    this.hideExport = this.hideExport.bind(this);
    this.deleteLast = this.deleteLast.bind(this);
    this.deleteSelected = this.deleteSelected.bind(this);
    this.clear = this.clear.bind(this);
    this.reallyClear = this.reallyClear.bind(this);
    this.keyDown = this.keyDown.bind(this);
    this.play = this.play.bind(this);
    this.selectFrame = this.selectFrame.bind(this);
    this.handleCloseModal = this.handleCloseModal.bind(this);
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

    window.addEventListener("beforeunload", this.handleBeforeUnload);
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
    /*.catch((err) => {
      // Handle an exception.
      console.log("error: "+err)
    });*/    
  }

  snap() {
    if (this.camRef.current !== null) {
      const dimension = {width: this.state.snapWidth, height: this.state.snapHeight}
      const captured = this.camRef.current.getScreenshot(dimension);
      let storeImage = (img: string) => {
        if (this.state.snaps === null) {
          this.setState({snaps: [img]});
        }
        else {
          this.setState({snaps: this.state.snaps.concat([img])});
        }
      }

      if (captured !== null) {
        if (this.state.rotate) {
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
      images: this.state.snaps,
      gifWidth: 500,
      gifHeight: 300,
      numWorkers: 5,
      frameDuration: 10 / this.state.frameRate,
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
    exportVideo(this.state.snaps, this.state.frameRate, this.state.snapWidth, this.state.snapHeight, (e: number) => this.setProgress(e * 100));
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
  selectFrame = (index: number) => (e: MouseEventHandler<HTMLImageElement>) => {  
    if (this.state.selectedFrameIndex === index) {
      this.deselectFrame();
    }
    else {
      this.setState({selectedFrameIndex: index});
    }
  }

  changeSelected(inc: number) {
    if (this.hasContent()) {
      let newIndex = this.isSelected() ? this.state.selectedFrameIndex + inc : this.state.snaps.length-1;

      if (newIndex < 0) {
        newIndex = 0;
      }
      if (newIndex >= this.state.snaps.length) {
        newIndex = this.state.snaps.length-1;
      }
      this.setState({selectedFrameIndex: newIndex});
    }
  }

  deleteLast() {
    this.setState({snaps: this.state.snaps.slice(0, -1)});
    this.deselectFrame();
  }

  deleteSelected() {
    var changedArray = this.state.snaps;
    changedArray.splice(this.state.selectedFrameIndex, 1);

    this.setState({snaps: changedArray});
    this.deselectFrame();
  }

  hasContent() {
    return this.state.snaps.length > 0;
  }

  clear() {
    this.setState({showClearModal: true});
  }

  reallyClear() {
    this.setState({snaps: []});
    this.handleCloseModal();
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
    return !(this.state.showClearModal || this.state.showExport || this.state.showSettings);
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

  handleCloseModal() {
    this.setState({showClearModal: false});
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
    let frameRate = parseInt(event.target.value);
    this.setLocalStorage("frameRate", frameRate);
    this.setState({frameRate: frameRate});
  }

  frameRateSelector() {
    return (
      <Form.Select aria-label="select frame rate" value={this.state.frameRate} onChange={this.changeFrameRate}>
        {possibleFrameRates.map((frameRate: number) => {
          return <option value={frameRate} key= {frameRate}>{frameRate}</option>
        })}
      </Form.Select>
    );
  }

  changeSize(event: ChangeEvent<HTMLSelectElement>) {
    let sizeIndex = parseInt(event.target.value);
    this.setLocalStorage("sizeIndex", sizeIndex);
    this.setState({sizeIndex: sizeIndex, snapWidth: possibleSizes[sizeIndex].width, snapHeight: possibleSizes[sizeIndex].height});
  }

  sizeSelector() {
    return (
      <Form.Select aria-label="select frame rate" value={this.state.sizeIndex} onChange={this.changeSize}>
        {possibleSizes.map((size: FrameSize, index: number) => {
          let sizeLabel = size.width+"x"+size.height;
          return <option value={index} key={sizeLabel}>{sizeLabel}</option>
        })}
      </Form.Select>
    );
  }

  changeMirror() {
    let newValue = !this.state.mirror
    this.setLocalStorage("mirror", newValue);
    this.setState({mirror: newValue});
  }

  changeRotate() {
    let newValue = !this.state.rotate;
    this.setLocalStorage("rotate", newValue);
    this.setState({rotate: newValue});
  }

  settings() {
    return (
    <Offcanvas show={this.state.showSettings} onHide={this.handleCloseSettings}>
      <Offcanvas.Header closeButton closeVariant="white">
        <Offcanvas.Title>Settings</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        Choose camera:
        { this.deviceSelector() }
        Frame rate:
        { this.frameRateSelector() }
        Size:
        { this.sizeSelector() }

        <Form.Check type="checkbox" id="mirror" label="Mirror" checked={this.state.mirror} onChange={this.changeMirror}/>
        <Form.Check type="checkbox" id="rotate" label="Rotate 180°" checked={this.state.rotate} onChange={this.changeRotate} />

      </Offcanvas.Body>
    </Offcanvas>
    );
  }

  modal() {
    return (
    <Modal show={this.state.showClearModal} onHide={this.handleCloseModal} animation={true}>
      <Modal.Header closeButton className="blackmodal" closeVariant="white">
        <Modal.Title>Delete All Frames</Modal.Title>
      </Modal.Header>
      <Modal.Body className="blackmodal">Do you really want to delete everything?</Modal.Body>
      <Modal.Footer className="blackmodal">
        <Button variant="danger" onClick={this.reallyClear}>
          Delete
        </Button>
        <Button variant="primary" onClick={this.handleCloseModal}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>);
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

  onExportFileNameChange(event: ChangeEvent<FormControlElement>) {
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
    let imageSrc = this.state.snaps[frameCount % this.state.snaps.length];
    var image = new Image();
    image.src = imageSrc;
    context.drawImage(image, 0, 0, context.canvas.width, context.canvas.height);
  }

  frame() {
    return (
      this.state.playing ?
      <FrameCanvas width={this.state.snapWidth*camFactor} height={this.state.snapHeight*camFactor} draw={this.drawFrame} frameRate={this.state.frameRate} />
      :
      <Webcam mirrored={this.state.mirror} 
        width={this.state.snapWidth*camFactor} height={this.state.snapHeight*camFactor} 
        audio={false} 
        screenshotFormat="image/jpeg" 
        videoConstraints={ {deviceId: this.state.selectedDeviceID, width: this.state.snapWidth, height: this.state.snapHeight} } 
        ref={this.camRef} 
        style={this.state.rotate ? {transform: "rotate(180deg)"} : {}}
        />
    );
  }

  render() {
    return (
      <div className="camMain" tabIndex={0} onKeyDown={this.keyDown} ref={this.mainDivRef}>
        { this.settings() }
        <br />
        <div className="projectTitle">{ this.getCurrentProject().getTitle() }</div>
        { this.frame() }
        <br />
        <Button variant="outline-primary" onClick={this.snap}><i className="bi bi-camera"></i></Button>{' '}
        <Button variant="outline-danger" onClick={this.deleteLast} disabled={!this.hasContent()}><i className="bi bi-backspace"></i></Button>{' '}
        <Button variant="outline-danger" onClick={this.deleteSelected} disabled={!this.isSelected()}>Delete Selected</Button>
        <br />
        <br />
        <Button variant="outline-success" onClick={this.skipStart} disabled={!this.hasContent()}><i className="bi bi-skip-start"></i></Button>{' '}
        <Button variant="outline-success" onClick={this.play} disabled={!this.hasContent()}>{this.state.playing ? <i className="bi bi-stop"></i> : <i className="bi bi-play"></i>}</Button>{' '}
        <Button variant="outline-success" onClick={this.skipEnd} disabled={!this.hasContent()}><i className="bi bi-skip-end"></i></Button>
        <br />
        <br />
        <Button variant="outline-success" onClick={this.makeNewProject}><i className="bi bi-plus-lg"></i></Button>{' '}
        <Button variant="outline-success" onClick={this.showExport} disabled={!this.hasContent()}><i className="bi bi-box-arrow-down"></i></Button>{' '}
        <Button variant="outline-primary" onClick={this.showSettings}><i className="bi bi-gear"></i></Button>{' '}
        <Button variant="outline-danger" onClick={this.clear} disabled={!this.hasContent()}><i className="bi bi-trash3"></i></Button>
        <br />
        <br />
        <div className="reel" id="reel">
          <div className="reelStart">{' '}</div>
          {this.state.snaps.map((source: string, index: number) => {
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
            <div className="snap takeSnap" alt={"&#xF220;"} key={"empty"} id={"empty"} onClick={this.snap}>
              <svg xmlns="http://www.w3.org/2000/svg" height="100%" fill="currentColor" className="bi bi-camera" viewBox="0 0 16 16">
                <path d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4z"/>
                <path d="M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5m0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M3 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"/>
              </svg>
            </div>
          </div>
        </div>
        { this.modal() }
        { this.export() }
      </div>
    );
  };
}

export default SnapCam;