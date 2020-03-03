import React from 'react';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import * as SearchActions from 'modules/search';
import { mount } from 'enzyme';
import TypeSelect from 'components/TypeSelect/TypeSelect';
import SearchBarTypingFilter from '../SearchBarTypingFilter';
import { TypesState } from '../../../modules/types';
import { SearchState } from '../../../modules/search';

jest.mock('utils/PermissionsUtils');
jest.mock('utils/Metrics');

const initialStoreState: any = {
  types: {
    items: {
      '1729121837401342': {
        externalId: 'sample-type',
        name: "David's Type",
        description: 'testing for david',
        properties: [],
        id: 1729121837401342,
        version: 1,
        createdTime: '2019-11-22T03:14:43.029Z',
        lastUpdatedTime: '2019-11-22T03:14:43.029Z',
      },
      '4989650985264432': {
        externalId: 'real',
        name: 'Real',
        properties: [
          {
            propertyId: 'source',
            name: 'source',
            description: 'source of type',
            type: 'string',
          },
          {
            propertyId: 'timeseries1',
            name: 'time series 1',
            description: 'Time series reference',
            type: 'timeseriesRef',
          },
        ],
        parentType: {
          id: 1426226854338845,
          version: 3,
          externalId: 'number',
        },
        id: 4989650985264432,
        version: 2,
        createdTime: '2020-01-20T09:59:07.508Z',
        lastUpdatedTime: '2020-01-20T09:59:07.508Z',
      },
    },
    error: false,
    assetTypes: {},
  } as Partial<TypesState>,
  search: {
    assetFilter: {},
  } as Partial<SearchState>,
};

const store = configureStore([thunk])(initialStoreState);

afterEach(() => {
  jest.clearAllMocks();
});

describe('Search Bar - Typing Filter', () => {
  it('can select option', () => {
    const mockFunction = jest.fn();
    jest
      .spyOn(SearchActions, 'updateAssetFilter')
      .mockReturnValue(mockFunction);
    // Test first render and effect
    const container = mount(
      <Provider store={store}>
        <MemoryRouter>
          <SearchBarTypingFilter />
        </MemoryRouter>
      </Provider>
    );
    const wrapper = container.find(TypeSelect);

    // Test second render and effect
    expect(container.find('li[role="option"]').length).toBe(0);

    wrapper.simulate('click');
    const options = container.find('li[role="option"]');
    expect(options.length).toBe(2);

    // choose an item
    options.at(0).simulate('click');
    expect(mockFunction).toBeCalled();
    expect(wrapper.text()).toContain('David');
  });

  it('cannot select option if disabled', () => {
    // Test first render and effect
    const container = mount(
      <Provider store={store}>
        <MemoryRouter>
          <SearchBarTypingFilter disabled />
        </MemoryRouter>
      </Provider>
    );
    const wrapper = container.find(TypeSelect);

    // Test second render and effect
    expect(container.find('li[role="option"]').length).toBe(0);

    wrapper.simulate('click');
    const options = container.find('li[role="option"]');
    expect(options.length).toBe(0);
  });
});
