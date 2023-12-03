import React, { Component } from 'react';
import './App.scss';

import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';


import SnapCam from "./SnapCam";

interface AppProps {
}

interface AppState {
}

export class App extends Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);

  }

  

  render() {
    return (
      <div className="App">
        <SnapCam />
      </div>
    );
  }
}

export default App;
