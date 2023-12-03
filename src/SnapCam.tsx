import Webcam from "react-webcam";
import React, { Component, MouseEventHandler } from 'react';
import { Form } from 'react-bootstrap';
import { createGIF } from 'gifshot';

import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

const snapWidth = 1280;
const snapHeight = 720;
const camFactor = 0.3;
const camWidth = snapWidth*camFactor;
const camHeight = snapHeight*camFactor;

const videoConstraints = {
  width: 1280,
  height: 720
};

interface SnapState {
  snaps: string[]
  progress: number
  selectedFrameIndex: number
  showClearModal: boolean
  inputDevices: MediaDeviceInfo[]
  selectedDeviceID: string
}
 
interface SnapProps {
}

export class SnapCam extends Component<SnapProps, SnapState> {
  private camRef: React.RefObject<Webcam>;
  private mainDivRef: React.RefObject<HTMLDivElement>;

  constructor(props: SnapProps) {
    super(props);

    this.camRef = React.createRef();
    this.mainDivRef = React.createRef();
    this.state = {snaps: [], progress: 0, selectedFrameIndex: -1, showClearModal: false, inputDevices: [], selectedDeviceID: ""};

    this.snap = this.snap.bind(this);
    this.exportAsGIF = this.exportAsGIF.bind(this);
    this.deleteLast = this.deleteLast.bind(this);
    this.deleteSelected = this.deleteSelected.bind(this);
    this.clear = this.clear.bind(this);
    this.reallyClear = this.reallyClear.bind(this);
    this.keyDown = this.keyDown.bind(this);
    this.play = this.play.bind(this);
    this.selectFrame = this.selectFrame.bind(this);
    this.handleCloseModal = this.handleCloseModal.bind(this);
    this.changeDevice = this.changeDevice.bind(this);
  }

  updateCameraList() {
    navigator.mediaDevices.enumerateDevices().then(devices => {this.setState({inputDevices: devices.filter(({ kind }) => kind === "videoinput")})});
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

  snap() {
    if (this.camRef.current !== null) {
      const dimension = {width: snapWidth, height: snapHeight}
      const captured = this.camRef.current.getScreenshot(dimension);

      if (captured !== null) {
        if (this.state.snaps === null) {
          this.setState({snaps: [captured]});
        }
        else {
          this.setState({snaps: this.state.snaps.concat([captured])});
        }
      }
      else {
        console.log("capture returned null!");
      }

      this.deselectFrame();
    }
  }

  setProgress(progress: number) {
    this.setState({progress: progress});
    //console.log(`progress: ${progress}`);
  }

  exportAsGIF() {
    const options = {
      images: this.state.snaps,
      gifWidth: 500,
      gifHeight: 300,
      numWorkers: 5,
      frameDuration: 0.01,
      sampleInterval: 10,
      progressCallback: (e: number) => this.setProgress(e * 100)
    };

    createGIF(options, (obj: { error: any; image: string; }) => {
      if (!obj.error) {
        const link = document.createElement('a');
        link.download = 'export.gif';
        link.href = obj.image;
        link.click();
        this.setProgress(0);
      }
    });
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

  }

  keyDown(e: { key: string; code: string; }) {
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

  handleCloseModal() {
    this.setState({showClearModal: false});
  }

  changeDevice(event: Event) {
    let deviceID = event.target.value;
    this.setState({selectedDeviceID: deviceID});
    //console.log("new ID: "+deviceID);
  }

  deviceSelector() {
    return (
      <Form.Select aria-label="Default select example" value={this.state.selectedDeviceID} onChange={this.changeDevice}>
        {this.state.inputDevices.map((device: MediaDeviceInfo, index: number) => {
          return <option value={device.deviceId} key= {device.deviceId}>{device.label}</option>
        })}
      </Form.Select>
    );
  }

  modal() {
    return (
    <Modal show={this.state.showClearModal} onHide={this.handleCloseModal} animation={false}>
      <Modal.Header closeButton>
        <Modal.Title>Delete All Frames</Modal.Title>
      </Modal.Header>
      <Modal.Body>Do you really want to delete everything?</Modal.Body>
      <Modal.Footer>
        <Button variant="danger" onClick={this.reallyClear}>
          Delete
        </Button>
        <Button variant="primary" onClick={this.handleCloseModal}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>);
  }

  render() {
    return (
      <div className="camMain" tabIndex={0} onKeyDown={this.keyDown} ref={this.mainDivRef}>
        { this.deviceSelector() }
        <br />
        <Webcam width={camWidth} height={camHeight} audio={false} videoConstraints={ {deviceId: this.state.selectedDeviceID, width: snapWidth, height: snapHeight} } ref={this.camRef} />

        <br />
        <Button variant="primary" onClick={this.snap}>Snap</Button>{' '}
        <Button variant="danger" onClick={this.deleteLast} disabled={!this.hasContent()}>Delete Last</Button>{' '}
        <Button variant="danger" onClick={this.deleteSelected} disabled={!this.isSelected()}>Delete Selected</Button>
        <br />
        <Button variant="primary" onClick={this.exportAsGIF} disabled={!this.hasContent()}>Export As GIF</Button>
        <br />
        <Button variant="danger" onClick={this.clear} disabled={!this.hasContent()}>Clear</Button>
        <br />
        {this.state.progress !== 0 && <label>Creating GIF... {this.state.progress}%</label>}
        <br />
        <div className="reel">
          {this.state.snaps.map((source: string, index: number) => {
            return <img src={source} className={this.state.selectedFrameIndex === index ? "snap selectedSnap" : "snap"} alt="captured" key={"snap"+index} id={"snap"+index} onClick={this.selectFrame(index)}/>;
          }
          )}
          
          <div className="snap takeSnap" alt={"&#xF220;"} key={"empty"} id={"empty"} onClick={this.snap}>
            <svg xmlns="http://www.w3.org/2000/svg" height="100%" fill="currentColor" className="bi bi-camera" viewBox="0 0 16 16">
              <path d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4z"/>
              <path d="M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5m0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M3 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"/>
            </svg>
          </div>
        </div>
        { this.modal() }
      </div>
    );
  };
}

export default SnapCam;