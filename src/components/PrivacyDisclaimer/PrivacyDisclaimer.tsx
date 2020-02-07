import React from 'react';
import styled from 'styled-components';
import { Button } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { updateTrackingEnabled } from '../../modules/app';
import { RootState } from '../../reducers/index';

const Footer = styled.div`
  width: 100vw;
  overflow: hidden;
  padding: 12px 40px;
  display: flex;
  border-top: 1px solid #ffc933;
  background-color: #fff1cc;
  align-items: center;
  p {
    flex: 1;
    margin-right: 12px;
    margin-bottom: 0px;
  }
  button.dismiss {
    margin-right: 0px;
  }
  button {
    margin-right: 12px;
  }
`;
type StateProps = {
  trackingEnabled: boolean | null;
};
type DispatchProps = {
  updateTrackingEnabled: typeof updateTrackingEnabled;
};
type Props = StateProps & DispatchProps;

class PrivacyDisclaimer extends React.Component<Props> {
  componentDidMount() {
    if (navigator.doNotTrack === '1') {
      // eslint-disable-next-line no-console
      console.warn(
        "Your browser's Do Not Track is turned on. Go to https://allaboutdnt.com/ to learn how you can turn it off."
      );
    }
  }

  render() {
    if (this.props.trackingEnabled !== null) {
      return null;
    }
    return (
      <Footer>
        <p>
          Just a heads up that we are using Mixpanel to track your usage of
          Discovery. We do not share this information with any other party and
          it is simply used to improve Discovery and provide a better experience
          overall!
        </p>
        <Button
          ghost
          type="danger"
          onClick={() => {
            this.props.updateTrackingEnabled(false);
          }}
        >
          Accept
        </Button>
        <Button
          ghost
          type="primary"
          onClick={() => {
            this.props.updateTrackingEnabled(true);
          }}
        >
          Dismiss
        </Button>
      </Footer>
    );
  }
}

const mapStateToProps = (state: RootState): StateProps => {
  return {
    trackingEnabled: state.app.trackingEnabled,
  };
};

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps =>
  bindActionCreators(
    {
      updateTrackingEnabled,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(PrivacyDisclaimer);
