import styled from 'styled-components';

const FlexTableWrapper = styled.div`
  flex: 1;

  .ant-empty-description {
    color: #dedede;
  }

  .ant-table-wrapper {
    height: 100%;

    .ant-spin-nested-loading {
      height: 100%;
    }

    .ant-spin-container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .ant-table {
      height: 0;
      flex: 1;
    }

    .ant-table-content {
      height: 100%;
    }

    .ant-table-scroll {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .ant-table-pagination.ant-pagination {
      display: block;
      margin-left: auto;
    }
    .ant-table-body {
      flex: 1;
    }
    .ant-table-placeholder {
      height: 100%;
    }
    .ant-empty-description {
      color: #dfdfdf;
    }
  }
`;

export default FlexTableWrapper;
