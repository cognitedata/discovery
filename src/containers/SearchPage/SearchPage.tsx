import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

type OrigProps = {};

type Props = {} & OrigProps;

type State = {};

class TypeBadge extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  render() {
    return <h1>sadfasdf</h1>;
  }
}

const mapStateToProps = () => {
  return {};
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({}, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(TypeBadge);
