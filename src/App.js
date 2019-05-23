import React from 'react';
import 'antd/dist/antd.css';
import { ReactAuthProvider } from '@cognite/react-auth';

import {
  Cognite3DViewer,
  Cognite3DModel,
  OnProgressData,
} from '@cognite/3d-viewer';
import * as sdk from '@cognite/sdk';
import { Model3DViewer } from '@cognite/gearbox';

function ThreeDViewer(props) {
  const cache = {};
  const modelId = 2495544803289093;
  const revisionId = 3041181389296996;
  const onClick = (nodeId) => {};
  const onProgress = (progress) => {};
  const onComplete = () => {};
  const onReady = (
    viewer,
    model,
    revision
  ) => {};
  
  return (
    <Model3DViewer
      modelId={modelId}
      revisionId={revisionId}
      onClick={onClick}
      onProgress={onProgress}
      onComplete={onComplete}
      onReady={onReady}
      cache={cache}
    />
  );
}

function App() {
  return (
    <ReactAuthProvider
    project={'akerbp'}
    redirectUrl={window.location.href}
    errorRedirectUrl={window.location.href}
  >
    <ThreeDViewer />
  </ReactAuthProvider>
  );
}

export default App;
