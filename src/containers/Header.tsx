import React from 'react';
import { Layout, Menu } from 'antd';
import styled from 'styled-components';
import { push } from 'connected-react-router';
import { Dispatch, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Logo from 'assets/discovery.svg';
import { selectAppState, AppState } from 'modules/app';
import { RootState } from 'reducers/index';

const { Header } = Layout;

const LogoWrapper = styled.a`
  float: left;
  display: inline-flex;
  height: 100%;
  align-items: center;

  h1 {
    margin-bottom: 0px;
    margin-left: 16px;
    margin-right: 52px;
    font-weight: bold;
    font-size: 20px;
    line-height: 24px;
  }
`;

const WrappedHeader = styled(Header)`
  && {
    height: 56px;
    background: #fff;
    border-bottom: 2px solid #e8e8e8;
    font-weight: bold;
  }
  .ant-menu {
    height: 54px;
    line-height: 54px;
    border-bottom: none;
    background: none;
  }
  .ant-menu-horizontal > .ant-menu-item,
  .ant-menu-horizontal > .ant-menu-submenu {
    padding-left: 2px;
    padding-right: 2px;
    margin-right: 40px;
  }
`;

type Props = { push: typeof push; app: AppState; pathname: string };
type State = {};
class DiscoveryHeader extends React.Component<Props, State> {
  readonly state: Readonly<State> = {};

  get selectedKeys(): string[] {
    const { pathname } = this.props;
    const [, , path] = pathname.split('/');
    if (path === 'relationships') {
      return ['relationships'];
    }
    return ['resources'];
  }

  render() {
    const { tenant } = this.props.app;
    return (
      <WrappedHeader>
        <LogoWrapper onClick={() => this.props.push(`/${tenant}`)}>
          <img src={Logo} alt="Cognite Logo" />
          <h1>Discovery</h1>
        </LogoWrapper>
        <Menu selectedKeys={this.selectedKeys} mode="horizontal">
          <Menu.Item
            key="resources"
            onClick={() => this.props.push(`/${tenant}`)}
          >
            <span>Resources</span>
          </Menu.Item>
          <Menu.Item
            key="relationships"
            onClick={() => this.props.push(`/${tenant}/relationships`)}
          >
            <span>Relationships</span>
          </Menu.Item>
        </Menu>
      </WrappedHeader>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectAppState(state),
    pathname: state.router.location.pathname,
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      push,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(DiscoveryHeader);
