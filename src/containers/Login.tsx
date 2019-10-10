import React from 'react';
import { connect } from 'react-redux';
import { TenantSelector } from '@cognite/gearbox';
import styled from 'styled-components';
import { bindActionCreators, Dispatch } from 'redux';
import { push } from 'connected-react-router';
import { setTenant } from '../modules/app';
import { sdk } from '../index';

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
  doPush: typeof push;
};

const Login = ({ doSetTenant, doPush }: Props) => (
  <Wrapper>
    <TenantSelectorContainer>
      <TenantSelector
        title="Discovery"
        onTenantSelected={(tenant, advancedOptions) => {
          const cdfEnv = advancedOptions
            ? advancedOptions['CDF Environment']
            : undefined;
          sdk.setBaseUrl(`https://${cdfEnv || 'api'}.cognitedata.com`);
          doSetTenant(tenant, true);
          doPush(`/${tenant}`);
        }}
        header="Cognite Data Fusion project name"
        validateTenant={(tenant, advancedOptions) => {
          const cdfEnv = advancedOptions
            ? advancedOptions['CDF Environment']
            : null;
          const clusterParam = cdfEnv ? `&cluster=${cdfEnv}` : '';
          return fetch(
            `https://opin-api.cognite.ai/tenant?tenant=${tenant}&app=opin${clusterParam}`
          ).then(response => response.json());
        }}
        loginText="Authenticate"
        placeholder="Project name"
        unknownMessage="The name you entered is not a valid project in Cognite Data Fusion"
        advancedOptions={{ 'CDF Environment': '' }}
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
      doSetTenant: setTenant,
      doPush: push,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Login);
