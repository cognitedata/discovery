import React from 'react';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import * as SearchActions from 'modules/search';
import { configure, mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import DataSetSelect from 'components/DataSetSelect';
import { SearchState } from 'modules/search';
import { DataSetsState } from 'modules/datasets';
import SearchBarDataSetFilter from '../SearchBarDataSetFilter';

jest.mock('utils/PermissionsUtils');
jest.mock('utils/Metrics');

configure({ adapter: new Adapter() });

const initialStoreState: any = {
  datasets: {
    items: {
      4448195087284397: {
        externalId: '693ad162-df1f-408b-87c7-e0ffdaa5e7cf',
        name: 'Entity Matcher Output',
        description: 'Made in Data Studio 693ad162-df1f-408b-87c7-e0ffdaa5e7cf',
        metadata: {
          COGNITE__SOURCE: 'data-studio',
        },
        writeProtected: false,
        id: 4448195087284397,
        createdTime: 1576745394155,
        lastUpdatedTime: 1576745394155,
      },
      4610653613010508: {
        externalId: '4223e48f-57f7-4823-aec1-9a6647512101',
        name: 'Entity Matcher Output',
        description: 'Made in Data Studio 4223e48f-57f7-4823-aec1-9a6647512101',
        metadata: {
          COGNITE__SOURCE: 'data-studio',
        },
        writeProtected: false,
        id: 4610653613010508,
        createdTime: 1576745154021,
        lastUpdatedTime: 1576745154021,
      },
    },
    error: false,
  } as Partial<DataSetsState>,
  search: {
    assetFilter: {},
  } as Partial<SearchState>,
};

const store = configureStore([thunk])(initialStoreState);

describe('Search Bar - Data Set Filter', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('can select option', () => {
    const mockFunction = jest.fn();
    jest
      .spyOn(SearchActions, 'updateAssetFilter')
      .mockReturnValue(mockFunction);
    // Test first render and effect
    const container = mount(
      <Provider store={store}>
        <MemoryRouter>
          <SearchBarDataSetFilter />
        </MemoryRouter>
      </Provider>
    );
    const wrapper = container.find(DataSetSelect);

    // Test second render and effect
    expect(container.find('li[role="option"]').length).toBe(0);

    wrapper.simulate('click');
    const options = container.find('li[role="option"]');
    expect(options.length).toBe(2);

    // choose an item
    options.at(0).simulate('click');
    expect(mockFunction).toBeCalled();
    expect(wrapper.text()).toContain('Entity Matcher');
  });

  it('cannot select option if disabled', () => {
    // Test first render and effect
    const container = mount(
      <Provider store={store}>
        <MemoryRouter>
          <SearchBarDataSetFilter disabled />
        </MemoryRouter>
      </Provider>
    );
    const wrapper = container.find(DataSetSelect);

    // Test second render and effect
    expect(container.find('li[role="option"]').length).toBe(0);

    wrapper.simulate('click');
    const options = container.find('li[role="option"]');
    expect(options.length).toBe(0);
  });
});
