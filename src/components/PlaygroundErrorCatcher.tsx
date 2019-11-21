import React from 'react';
import { trackUsage } from '../utils/metrics';

type Props = {};
type State = {
  hasError: boolean;
};
export default class PlaygroundErrorCatcher extends React.Component<
  Props,
  State
> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidCatch(error: any, info: any) {
    this.setState({ hasError: true });
    trackUsage('PlaygroundError', { error, info });
  }

  render() {
    if (this.state.hasError) {
      return <h1>Opps, something went wrong</h1>;
    }
    return this.props.children;
  }
}
