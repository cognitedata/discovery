import React from 'react';
import styled from 'styled-components';
import { Button } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { selectAppState, setTrackingEnabled } from '../../modules/app';
import { RootState } from '../../reducers/index';

const Footer = styled.div`
  width: 100vw;
  overflow: hidden;
  padding: 12px 40px;
  display: flex;
  border-top: 1px solid #efefef;
  background-color: #fff;
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
  setTrackingEnabled: typeof setTrackingEnabled;
};
type Props = StateProps & DispatchProps;

class PrivacyDisclaimer extends React.Component<Props> {
  componentDidMount() {
    if (this.props.trackingEnabled === null) {
      setTimeout(() => {
        this.props.setTrackingEnabled(true);
      }, 30000);
    } else if (navigator.doNotTrack === '1') {
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
          Just a heads up that we are tracking your email and usage in
          Discovery. We do not share this information with any other party and
          it is simply used to improve Discovery and provide a better experience
          overall!
        </p>
        <Button
          onClick={() => {
            this.props.setTrackingEnabled(false);
          }}
        >
          Opt Out
        </Button>
        <Button
          ghost
          type="primary"
          onClick={() => {
            this.props.setTrackingEnabled(true);
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
    trackingEnabled: selectAppState(state).trackingEnabled,
  };
};

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps =>
  bindActionCreators(
    {
      setTrackingEnabled,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(PrivacyDisclaimer);
