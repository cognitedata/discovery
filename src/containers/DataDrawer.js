import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Drawer, Card } from 'antd';
import Chart from 'react-apexcharts';
import { selectResult, selectIsLoading } from '../modules/search';
import Loader from '../components/Loader';

class DataDrawer extends React.Component {
  state = {};

  componentDidMount() {}

  componentDidUpdate(prevProps) {}

  renderPieCharts = () => {
    const pieCharts = this.props.result.filter(
      result => result.kind === 'pie-chart'
    );

    return pieCharts.map(chart => {
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
    });
  };

  render() {
    // if (asset == null) {
    //   return (
    //     <SpinContainer>
    //       <Spin />
    //     </SpinContainer>
    //   );
    // }

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
        {this.renderPieCharts()}
        {this.props.result.length === 0 && 'No results'}
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
