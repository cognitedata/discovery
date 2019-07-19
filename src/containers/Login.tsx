// TODO this can be a component
import React from 'react';
import { connect } from 'react-redux';
import { TenantSelector, PureObject } from '@cognite/gearbox';
import styled from 'styled-components';
import { RootState } from '../reducers/index';

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  height: 100vh;
`;

const TenantSelectorContainer = styled.div`
  max-width: 600px;
  min-width: 400px;
  align-self: center;
`;

type OrigProps = {
  history: any;
};

type Props = {
  onTenantSelected: (tenant: string, advancedOptions: PureObject | null) => void;
};

const Login = ({ onTenantSelected }: Props) => (
  <Wrapper>
    <TenantSelectorContainer>
      <TenantSelector title="Cognite Digital Twin Explorer" onTenantSelected={onTenantSelected} placeholder="" />
    </TenantSelectorContainer>
  </Wrapper>
);

const mapStateToProps = (_: RootState, ownProps: OrigProps) => {
  const onTenantSelected = (tenant: string) => {
    ownProps.history.push(`/${tenant}`);
  };
  return { onTenantSelected };
};

export default connect(mapStateToProps)(Login);
