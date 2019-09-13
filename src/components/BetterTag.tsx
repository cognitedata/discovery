import React, { ReactNode } from 'react';
import styled from 'styled-components';
import { Icon } from 'antd';

const Wrapper = styled.div<{ closable: string }>`
  background: #4a67fb;
  display: inline-flex;
  max-width: 100%;
  text-overflow: ellipsis;
  transition: 0.3s all;
  color: #fff;
  font-size: 12px;
  padding: 4px 8px;
  cursor: ${props => (props.closable ? 'pointer' : 'default')};
  margin-bottom: 4px;
  margin-right: 2px;

  &&:hover {
    background: ${props => (props.closable ? '#24d8ed' : '#4a67fb')};
  }

  span {
    color: #fff;
    flex: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }

  i {
    color: #fff;
    align-self: center;
    margin-left: 4px;
  }
`;

export const BetterTag = ({
  children,
  closable = false,
  onClose,
}: {
  children: ReactNode;
  closable: boolean;
  onClose: () => void;
}) => {
  return (
    <Wrapper onClick={onClose} closable={closable ? 'true' : 'false'}>
      <span>{children}</span>
      <Icon type="close" />
    </Wrapper>
  );
};
