import React from 'react';
import styled from 'styled-components';

const propTypes = {};

const defaultProps = {};

const Bars = styled.div`
  display: flex;
  width: 360px;
  margin: 0 auto;
  justify-content: space-between;
  .bar {
    width: 24px;
    height: 100px;
    background: gray;
  }
  .bar:nth-child(even) {
    top: 100px;
    left: -48px;
    background: gray;
    position: relative;
    animation-name: move;
    animation-duration: 2s;
    animation-iteration-count: infinite;
    animation-direction: alternate;
    animation-timing-function: ease-out;
  }
  .bar:nth-child(even):before {
    display: block;
    height: 100px;
    content: '';
    width: 24px;
    position: absolute;
    z-index: 1;
    animation-name: drag;
    animation-duration: 2s;
    animation-iteration-count: infinite;
    animation-direction: alternate;
    animation-timing-function: ease-out;
    z-index: -1;
  }
  .bar:nth-child(2) {
    animation-delay: 0.9s;
  }
  .bar:nth-child(2):before {
    animation-delay: 0.9s;
    background-image: linear-gradient(to right, #fb2474, #ff6917);
  }
  .bar:nth-child(4) {
    animation-delay: 1s;
  }
  .bar:nth-child(4):before {
    animation-delay: 1s;
    background-image: linear-gradient(to right, #c844db, #fb2474);
  }
  .bar:nth-child(6) {
    animation-delay: 1.1s;
  }
  .bar:nth-child(6):before {
    animation-delay: 1.1s;
    background-image: linear-gradient(to right, #ff6917, #ffbb00);
  }
  .bar:nth-child(8) {
    animation-delay: 1.2s;
  }
  .bar:nth-child(8):before {
    animation-delay: 1.2s;
    background-image: linear-gradient(to right, #23d8ed, #4967fb);
  }
  @keyframes move {
    0% {
      top: 100px;
      left: -48px;
    }
    10% {
      top: 100px;
      left: -48px;
    }
    45% {
      left: 0;
      top: 100px;
    }
    55% {
      left: 0;
      top: 100px;
    }
    90% {
      top: 0;
      left: 0;
    }
    100% {
      top: 0;
      left: 0;
    }
  }
  @keyframes drag {
    0% {
      top: 0;
      left: 0;
    }
    10% {
      top: 0;
      left: 0;
    }
    15% {
      left: -8px;
      top: 0px;
    }
    25% {
      left: -14px;
      top: 0px;
    }
    45% {
      left: 0;
      top: 0;
    }
    55% {
      left: 0;
      top: 0;
    }
    65% {
      top: 28px;
    }
    75% {
      top: 28px;
    }
    90% {
      top: 0;
      left: 0;
    }
    100% {
      top: 0;
      left: 0;
    }
  }
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: '350px';
  position: relative;
  z-index: 100;
`;

const Loader = () => (
  <Wrapper>
    <Bars>
      <div className="bar" />
      <div className="bar" />
      <div className="bar" />
      <div className="bar" />
      <div className="bar" />
      <div className="bar" />
      <div className="bar" />
      <div className="bar" />
    </Bars>
  </Wrapper>
);

Loader.propTypes = propTypes;
Loader.defaultProps = defaultProps;

export default Loader;
