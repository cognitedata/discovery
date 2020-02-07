import React from 'react';
import styled from 'styled-components';
import { Button, Icon } from 'antd';
import VerticallyCenteredRow from 'components/VerticallyCenteredRow';

const Wrapper = styled.div`
  padding: 12px 32px;
  border-bottom: 1px solid #d9d9d9;
  && > div {
    margin-bottom: 0px;
  }
`;

const LeftDescription = styled.div`
  display: flex;
  align-items: center;
  div {
    margin-left: 12px;

    h4 {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 0px;
      margin-top: 0px;
    }

    p {
      margin-top: 0px;
      color: #595959;
      font-size: 12px;
      margin-bottom: 0px;
    }
  }
`;

type Props = {
  name: string;
  description?: string;
  onButtonClicked?: () => void;
  onBackClicked: () => void;
  buttonText?: string;
};

type State = {};

class ViewingDetailsNavBar extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {};
  }

  render() {
    const { name, description, buttonText } = this.props;
    return (
      <Wrapper>
        <VerticallyCenteredRow>
          <div className="left">
            <LeftDescription>
              <Icon type="arrow-left" onClick={this.props.onBackClicked} />
              <div>
                <h4>{name}</h4>
                {description && <p>{description}</p>}
              </div>
            </LeftDescription>
          </div>
          <div className="right">
            <Button type="primary" onClick={this.props.onButtonClicked}>
              {buttonText || 'Go to details'}
            </Button>
          </div>
        </VerticallyCenteredRow>
      </Wrapper>
    );
  }
}
export default ViewingDetailsNavBar;
