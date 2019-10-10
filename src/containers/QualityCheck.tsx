import React from 'react';
import styled from 'styled-components';
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { push } from 'connected-react-router';
import {
  setAppCurrentPage,
  selectApp,
  AppState,
  setAppDataKit,
} from '../modules/app';
import { RootState } from '../reducers/index';
import { DataKitState, selectDatakit } from '../modules/datakit';

const Wrapper = styled.div`
  margin: 12px;
  padding: 24px;
  background: #fff;
  flex: 1;

  display: flex;
  flex-direction: column;

  iframe {
    box-shadow: none;
    border: 3px solid #cdcdcd;
  }
`;

type Props = {
  datakit: DataKitState;
  app: AppState;
  match: any;
  push: typeof push;
  setAppCurrentPage: typeof setAppCurrentPage;
  setAppDataKit: typeof setAppDataKit;
};
type State = {};

class QualityCheckView extends React.Component<Props, State> {
  componentDidMount() {
    this.props.setAppCurrentPage(2);
    const {
      match: {
        params: { datakit },
      },
      datakit: dataKitStore,
      app: { datakit: currentAppDataKit, tenant },
    } = this.props;
    if (datakit !== currentAppDataKit && datakit && dataKitStore[datakit]) {
      this.props.setAppDataKit(datakit);
    } else if (!dataKitStore[currentAppDataKit || datakit]) {
      this.props.push(`/${tenant}/datakits`);
    }
  }

  render() {
    const {
      app: { token },
    } = this.props;
    return (
      <Wrapper>
        <h1>Quality Check</h1>
        <div style={{ flex: 1 }}>
          <iframe
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            src={`https://jupyter-notebooks.cogniteapp.com/contextualization-notebooks/notebook/402030468482084/?access_token=${encodeURIComponent(
              token!
            )}`}
            title="Quality Check Notebook"
            height="100%"
            width="100%"
          />
        </div>
      </Wrapper>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectApp(state),
    datakit: selectDatakit(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ setAppCurrentPage, push, setAppDataKit }, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(QualityCheckView);
