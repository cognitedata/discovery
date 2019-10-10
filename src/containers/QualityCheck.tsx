import React from 'react';
import styled from 'styled-components';
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { setAppCurrentPage, selectApp, AppState } from '../modules/app';
import { RootState } from '../reducers/index';

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
  app: AppState;
  setAppCurrentPage: typeof setAppCurrentPage;
};
type State = {};

class QualityCheckView extends React.Component<Props, State> {
  componentDidMount() {
    // if (!this.props.app.datakit){

    // }
    this.props.setAppCurrentPage(2);
  }

  render() {
    return (
      <Wrapper>
        <h1>Quality Check</h1>
        <div style={{ flex: 1 }}>
          <iframe
            src="https://jupyter-notebooks.cogniteapp.com/contextualization-notebooks/notebook/589509274589915/"
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
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ setAppCurrentPage }, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(QualityCheckView);
