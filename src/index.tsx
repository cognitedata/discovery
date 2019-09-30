import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import * as mixpanel from 'mixpanel-browser';
import { CogniteClient } from '@cognite/sdk';
import { ClientSDKProvider } from '@cognite/gearbox';
import store from './store';
import Routes from './routes';
import 'antd/dist/antd.css';
import './styles/globalStyles.css';
import * as serviceWorker from './utils/serviceWorker';

mixpanel.init('fb25742efb56d116b736515a0ad5f6ef', {}, 'context');

export const sdk = new CogniteClient({
  appId: 'Discovery',
  baseUrl: 'https://greenfield.cognitedata.com/api/playground/',
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
