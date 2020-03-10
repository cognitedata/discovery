import React from 'react';
import { connect } from 'react-redux';
import { TenantSelector } from '@cognite/gearbox';
import styled from 'styled-components';
import { bindActionCreators, Dispatch } from 'redux';
import { sdk } from 'utils/SDK';
import { updateCdfEnv, updateTenant } from '../modules/app';

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
  doUpdateCdfEnv: typeof updateCdfEnv;
  doUpdateTenant: typeof updateTenant;
};

const Login = ({ doUpdateCdfEnv, doUpdateTenant }: Props) => {
  const initialTenant =
    window.localStorage.getItem('tenant') !== null
      ? (window.localStorage.getItem('tenant') as string)
      : undefined;
  const initialEnv =
    window.localStorage.getItem('env') !== null
      ? (window.localStorage.getItem('env') as string)
      : '';
  return (
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
              window.localStorage.setItem('env', cdfEnv);
            }
            doUpdateCdfEnv(cdfEnv);
            window.localStorage.setItem('tenant', tenant);
            doUpdateTenant(tenant, true);
          }}
          header="Cognite Data Fusion project name"
          validateTenant={(tenant, advancedOptions) => {
            const cdfEnv = advancedOptions
              ? advancedOptions['CDF Environment (i.e. Greenfield)']
              : null;
            const clusterParam = cdfEnv ? `&cluster=${cdfEnv}` : '';
            return fetch(
              `https://apps-api.cognite.ai/tenant?tenant=${tenant}&app=opin${clusterParam}`
            ).then(response => response.json());
          }}
          loginText="Authenticate"
          placeholder="Project name"
          initialTenant={initialTenant}
          unknownMessage="The name you entered is not a valid project in Cognite Data Fusion"
          advancedOptions={{ 'CDF Environment (i.e. Greenfield)': initialEnv }}
        />
      </TenantSelectorContainer>
    </Wrapper>
  );
};

const mapStateToProps = () => {
  return {};
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      doUpdateCdfEnv: updateCdfEnv,
      doUpdateTenant: updateTenant,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(Login);
