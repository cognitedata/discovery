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
    box-shadow: 0px 0px 8px #cdcdcd;

    .button-row button {
      margin-top: 6px;
      margin-right: 6px;
    }
    .button-row button:last-child() {
      margin-right: 0px;
    }
  }
`;

type Props = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};

export default ({ children, onClose, title }: Props) => (
  <StyledCard
    title={title}
    extra={[<Icon key="close" type="close" onClick={onClose} />]}
  >
    {children}
  </StyledCard>
);
