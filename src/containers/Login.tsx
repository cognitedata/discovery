import React from 'react';
import { connect } from 'react-redux';
import { TenantSelector } from '@cognite/gearbox';
import styled from 'styled-components';
import { bindActionCreators, Dispatch } from 'redux';
import { sdk } from 'index';
import { setTenant, setCdfEnv } from '../modules/app';

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
  doSetCdfEnv: typeof setCdfEnv;
};

const Login = ({ doSetTenant, doSetCdfEnv }: Props) => (
  <Wrapper>
    <TenantSelectorContainer>
      <TenantSelector
        title="Discovery"
        onTenantSelected={(tenant, advancedOptions) => {
          const cdfEnv = advancedOptions
            ? (advancedOptions['CDF Environment (i.e. Greenfield)'] as string)
            : undefined;
          if (cdfEnv) {
            sdk.setBaseUrl(`https://${cdfEnv}.cognitedata.com`);
          }
          doSetCdfEnv(cdfEnv);
          doSetTenant(tenant, true);
        }}
        header="Cognite Data Fusion project name"
        validateTenant={(tenant, advancedOptions) => {
          const cdfEnv = advancedOptions
            ? advancedOptions['CDF Environment (i.e. Greenfield)']
            : null;
          const clusterParam = cdfEnv ? `&cluster=${cdfEnv}` : '';
          return fetch(
            `https://opin-api.cognite.ai/tenant?tenant=${tenant}&app=opin${clusterParam}`
          ).then(response => response.json());
        }}
        loginText="Authenticate"
        placeholder="Project name"
        unknownMessage="The name you entered is not a valid project in Cognite Data Fusion"
        advancedOptions={{ 'CDF Environment (i.e. Greenfield)': '' }}
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
      doSetCdfEnv: setCdfEnv,
      doSet: setTenant,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Login);
