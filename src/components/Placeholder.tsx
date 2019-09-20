import React from 'react';
import styled from 'styled-components';
import NoDataImg from '../assets/nodata.svg';

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

const Placeholder = ({
  text = 'Please select an Asset!',
}: {
  text?: string;
}) => {
  return (
    <Wrapper>
      <div>
        <img src={NoDataImg} alt="" />
        <h3>{text}</h3>
      </div>
    </Wrapper>
  );
};

export default Placeholder;
