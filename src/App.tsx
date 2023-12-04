import React, { Component } from 'react';

import './App.scss';

import SnapCam from "./SnapCam";

interface AppProps {
}

interface AppState {
}

export class App extends Component<AppProps, AppState> {
  render() {
    return (
      <div className="App">
        <SnapCam />
      </div>
    );
  }
}

export default App;
