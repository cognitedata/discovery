import React from 'react';
import styled from 'styled-components';
import Placeholder from '../assets/placeholder.svg';

const Wrapper = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  flex-direction: row;
  align-items: center;

  div {
    align-self: center;
    margin: 0 auto;
    text-align: center;
  }
  h3 {
    margin-top: 12px;
  }
`;

const NoAssetSelected = () => {
  return (
    <Wrapper>
      <div>
        <img src={Placeholder} alt="" />
        <h3>Please select an Asset!</h3>
      </div>
    </Wrapper>
  );
};

export default NoAssetSelected;
