import React from 'react';
import { connect } from 'react-redux';
import { Modal, Button, Input, message } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import RelationshipQueryTreeViewer from 'containers/NetworkViewers/RelationshipQueryTreeViewer';
import { sdk } from '../../index';

const Content = styled.div`
  height: 60vh;
  display: flex;
  flex-direction: column;
  div.query {
    display: flex;
    margin-bottom: 12px;
    button {
      margin-left: 12px;
    }
  }
  div.graph {
    flex: 1;
    position: relative;
    height: 0;
  }
  div.pre {
    max-height: 200px;
    flex: 1;
    overflow-y: auto;
  }
`;

type Props = { onClose: () => void };

type State = {
  query: string;
  loading: boolean;
  result?: {
    vertexProperties?: { key: string; value: string }[];
    longResults: number[];
  };
};

class RelationshipQueryModal extends React.Component<Props, State> {
  readonly state: Readonly<State> = {
    loading: false,
    query: '',
  };

  runQuery = async () => {
    const { query } = this.state;
    if (query.length > 0) {
      try {
        const response = await sdk.post(
          `/api/playground/projects/${sdk.project}/restrictedGraphQuery`,
          {
            data: {
              items: [
                {
                  query,
                },
              ],
            },
          }
        );
        this.setState({ result: response.data, loading: false });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        message.error('Unable to run query');
        this.setState({ result: undefined });
      }
    }
  };

  render() {
    const { loading, query, result } = this.state;
    return (
      <Modal
        visible
        centered
        title="Relationship Graph Query"
        width="90%"
        onCancel={this.props.onClose}
        footer={undefined}
      >
        <Content>
          <div className="query">
            <Input
              style={{ flex: 1 }}
              placeholder="Please put a query!"
              value={query}
              onChange={e => this.setState({ query: e.target.value })}
            />
            <Button
              type="primary"
              loading={loading}
              onClick={() =>
                this.setState(
                  { loading: true, result: undefined },
                  this.runQuery
                )
              }
            >
              Run Query
            </Button>
          </div>
          {result && result.vertexProperties && (
            <div className="graph">
              <RelationshipQueryTreeViewer nodes={result.vertexProperties} />
            </div>
          )}
          <div className="pre">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        </Content>
      </Modal>
    );
  }
}

const mapStateToProps = () => {
  return {};
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RelationshipQueryModal);
