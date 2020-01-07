import React from 'react';
import { Card, Icon } from 'antd';
import styled from 'styled-components';

const StyledCard = styled(Card)`
  && {
    position: absolute;
    bottom: 32px;
    right: 32px;
    width: 300px;
    height: auto;
    box-shadow: 0px 0px 4px #232323;

    .button-row {
      margin-top: 6px;
    }
    .button-row button {
      margin-left: 6px;
    }
    .button-row button:nth-child(1) {
      margin-left: 0px;
    }
  }
`;

type Props = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};

export default ({ children, onClose, title }: Props) => (
  <StyledCard title={title} extra={[<Icon type="close" onClick={onClose} />]}>
    {children}
  </StyledCard>
);
