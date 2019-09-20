import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  flex-direction: column;
  align-items: center;

  div {
    align-self: center;
    margin: 0 auto;
  }
`;

const NoAssetSelected = () => {
  return (
    <Wrapper>
      <div>
        <h3>Please select an Asset!</h3>
      </div>
    </Wrapper>
  );
};

export default NoAssetSelected;
