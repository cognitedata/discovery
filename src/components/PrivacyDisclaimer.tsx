import React from 'react';
import styled from 'styled-components';
import { Button } from 'antd';

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

export const PRIVACY_ACCEPT = 'acceptPrivacy';

class PrivacyDisclaimer extends React.Component {
  componentDidMount() {
    if (localStorage.getItem(PRIVACY_ACCEPT) === null) {
      setTimeout(() => {
        localStorage.setItem(PRIVACY_ACCEPT, 'true');
        this.forceUpdate();
      }, 30000);
    } else if (navigator.doNotTrack === '1') {
      // eslint-disable-next-line no-console
      console.warn(
        "Your browser's Do Not Track is turned on. Go to https://allaboutdnt.com/ to learn how you can turn it off."
      );
    }
  }

  render() {
    if (
      localStorage.getItem(PRIVACY_ACCEPT) === 'true' ||
      localStorage.getItem(PRIVACY_ACCEPT) === 'false'
    ) {
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
            localStorage.setItem(PRIVACY_ACCEPT, 'false');
            this.forceUpdate();
          }}
        >
          Opt Out
        </Button>
        <Button
          ghost
          type="primary"
          onClick={() => {
            localStorage.setItem(PRIVACY_ACCEPT, 'true');
            this.forceUpdate();
          }}
        >
          Dismiss
        </Button>
      </Footer>
    );
  }
}

export default PrivacyDisclaimer;
