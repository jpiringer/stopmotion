import Webcam from "react-webcam";
import React, { Component } from 'react';
import { createGIF } from 'gifshot';

import Button from 'react-bootstrap/Button';

const camWidth = 1280/4;
const camHeight = 720/4;
const snapWidth = 1280;
const snapHeight = 720;
const capturedWidth = 128;
const capturedHeight = 72;

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: "user"
};

interface SnapState {
  snaps: string[]
  progress: number
}

interface SnapProps {
}

export class SnapCam extends Component<SnapProps, SnapState> {
  private camRef: React.RefObject<Webcam>;

  constructor(props: SnapProps) {
    super(props);

    this.camRef = React.createRef();
    this.state = {snaps: [], progress: 0};

    this.snap = this.snap.bind(this);
    this.exportAsGIF = this.exportAsGIF.bind(this);
    this.deleteLast = this.deleteLast.bind(this);
    this.clear = this.clear.bind(this);
  }

  componentDidMount() {
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

    createGIF(options, obj => {
      if (!obj.error) {
        const link = document.createElement('a');
        link.download = 'export.gif';
        link.href = obj.image;
        link.click();
        this.setProgress(0);
      }
    });
  }

  deleteLast() {
    this.setState({snaps: this.state.snaps.slice(0, -1)});
  }

  clear() {
    this.setState({snaps: []});
  }

  render() {
    return (
      <div>
        <Webcam width={camWidth} height={camHeight} videoConstraints={videoConstraints} ref={this.camRef} />

        <br />
        <Button variant="primary" onClick={this.snap}>Snap</Button>{' '}
        <Button variant="danger" onClick={this.deleteLast}>Delete Last</Button>
        <br />
        <Button variant="primary" onClick={this.exportAsGIF}>Export As GIF</Button>
        <br />
        <Button variant="danger" onClick={this.clear}>Clear</Button>
        <br />
        {this.state.progress !== 0 && <label>Creating GIF... {this.state.progress}%</label>}
        <br />
        <div>
          {this.state.snaps.map(source => {
            return <img src={source} width={capturedWidth} height={capturedHeight} alt={"captured"} />;
          }
          )}
        </div>
      </div>
    );
  };
}

export default SnapCam;