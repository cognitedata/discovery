import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Drawer, Card, Collapse } from 'antd';
import Chart from 'react-apexcharts';
import {
  SVGViewer,
  TimeseriesChartMeta,
  TimeseriesChart,
} from '@cognite/gearbox';
import styled from 'styled-components';
import { selectResult, selectIsLoading } from '../modules/search';
import Loader from '../components/Loader';

const { Panel } = Collapse;
const getTextFromMetadataNode = node =>
  (node.textContent || '').replace(/\s/g, '');

const StyledSVGViewerContainer = styled.div`
  height: 100%;
  width: 100%;
  .myCoolThing {
    outline: auto 2px #3838ff;
    transition: all 0.2s ease;
    > {
      text {
        stroke: #3838ff;
        fill: #3838ff;
        transition: all 0.2s ease;
        text-decoration: none;
      }
      path {
        stroke: #3838ff;
        transition: all 0.2s ease;
      }
    }
    &:hover,
    &:focus {
      outline: auto 2px #36a2c2;
    }
  }
`;

class DataDrawer extends React.Component {
  state = {};

  componentDidMount() {}

  componentDidUpdate(prevProps) {}

  renderPieCharts = () => {
    const pieCharts = this.props.result.filter(
      result => result.kind === 'pie-chart'
    );
    if (pieCharts.length === 0) {
      return null;
    }

    return (
      <Panel header="Pie charts" key="1">
        {pieCharts.map(chart => {
          const labels = chart.data.map(item => item.title);
          const series = chart.data.map(item => item.value);
          const { title } = chart;
          const options = {
            labels,
            responsive: [
              {
                breakpoint: 480,
                options: {
                  chart: {
                    width: 200,
                  },
                  legend: {
                    position: 'bottom',
                  },
                },
              },
            ],
          };

          return (
            <Card key={title} title={title}>
              <Chart
                options={options}
                series={series}
                type="pie"
                width={450}
                height={450}
              />
            </Card>
          );
        })}
      </Panel>
    );
  };

  renderPNID() {
    const PnIDs = this.props.result.filter(result => result.kind === 'PnID');
    if (PnIDs.length === 0) {
      return null;
    }
    const currentPnID = PnIDs[0];

    return (
      <Panel header="P&ID" key="3">
        <StyledSVGViewerContainer style={{ height: this.props.width }}>
          <SVGViewer
            documentId={currentPnID.fileId}
            title={currentPnID.name}
            description="P&ID"
            isCurrentAsset={metadata => {
              return (
                getTextFromMetadataNode(metadata) === currentPnID.assetName
              );
            }}
          />
        </StyledSVGViewerContainer>
      </Panel>
    );
  }

  renderTimeseries() {
    const timeseries = this.props.result.filter(
      result => result.kind === 'timeseries'
    );
    if (timeseries.length === 0) {
      return null;
    }

    return (
      <Panel header="Timeseries" key="2">
        {timeseries.map(ts => (
          <TimeseriesChart
            timeseriesIds={[ts.id]}
            key={ts.id}
            zoomable={false}
            startTime={new Date(2019, 3, 1)}
            endTime={new Date(2019, 6, 1)}
          />
        ))}
      </Panel>
    );
  }

  render() {
    return (
      <Drawer
        title="Search results"
        placement="right"
        width={this.props.width}
        closable={false}
        visible
        mask={false}
      >
        {this.props.loading && <Loader />}
        <Collapse defaultActiveKey={['1', '2', '3']}>
          {this.renderPieCharts()}
          {this.renderTimeseries()}
          {this.renderPNID()}
        </Collapse>
        {!this.props.loading && this.props.result.length === 0 && 'No results'}
      </Drawer>
    );
  }
}
DataDrawer.propTypes = {
  width: PropTypes.number.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  result: PropTypes.any.isRequired,
  loading: PropTypes.bool.isRequired,
};

const mapStateToProps = (state, ownProps) => {
  return { result: selectResult(state), loading: selectIsLoading(state) };
};
const mapDispatchToProps = dispatch => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DataDrawer);
