import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { CogniteClient } from '@cognite/sdk';
import { ClientSDKProvider } from '@cognite/gearbox';
import store from './store';
import Routes from './routes';
import 'brace/theme/github';
import 'brace/mode/json';
import 'antd/dist/antd.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import './styles/globalStyles.css';
import * as serviceWorker from './utils/serviceWorker';

export const sdk = new CogniteClient({
  appId: 'Discovery',
});

render(
  <ClientSDKProvider client={sdk}>
    <Provider store={store}>
      <Routes />
    </Provider>
  </ClientSDKProvider>,
  document.getElementById('root')
);
// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
