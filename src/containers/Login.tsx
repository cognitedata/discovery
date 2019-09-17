import React from 'react';
import { connect } from 'react-redux';
import { TenantSelector } from '@cognite/gearbox';
import styled from 'styled-components';
import { bindActionCreators, Dispatch } from 'redux';
import { setTenant } from '../modules/app';

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

type Props = {
  doSetTenant: typeof setTenant;
};

const Login = ({ doSetTenant }: Props) => (
  <Wrapper>
    <TenantSelectorContainer>
      <TenantSelector
        title="Cognite Digital Twin Explorer"
        onTenantSelected={doSetTenant}
        placeholder=""
      />
    </TenantSelectorContainer>
  </Wrapper>
);

const mapStateToProps = () => {
  return {};
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      setTenant,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Login);
