import React from 'react';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import * as SearchActions from 'modules/search';
import { configure, mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { Checkbox } from 'antd';
import SearchBarAnnotationsFilter from '../SearchBarAnnotationsFilter';
import { SearchState } from '../../../modules/search';

jest.mock('utils/PermissionsUtils');
jest.mock('utils/Metrics');

configure({ adapter: new Adapter() });

afterEach(() => {
  jest.clearAllMocks();
});

describe('Search Bar - Annotations Filter', () => {
  it('can toggle on and off', () => {
    const initialStoreState: any = {
      search: { searchByAnnotation: false } as Partial<SearchState>,
    };

    const store = configureStore([thunk])(initialStoreState);
    const mockFunction = jest.fn();
    jest
      .spyOn(SearchActions, 'updateSearchByAnnotation')
      .mockReturnValue(mockFunction);
    // Test first render and effect
    const container = mount(
      <Provider store={store}>
        <MemoryRouter>
          <SearchBarAnnotationsFilter />
        </MemoryRouter>
      </Provider>
    );

    // Test second render and effect
    expect(container.find(Checkbox).exists()).toBe(true);

    container.find('input').simulate('change', { target: { checked: true } });
    expect(mockFunction).toBeCalled();
  });

  it('checked when state is true', () => {
    const initialStoreState: any = {
      search: { searchByAnnotation: true } as Partial<SearchState>,
    };

    const store = configureStore([thunk])(initialStoreState);
    const mockFunction = jest.fn();
    jest
      .spyOn(SearchActions, 'updateSearchByAnnotation')
      .mockReturnValue(mockFunction);
    // Test first render and effect
    const container = mount(
      <Provider store={store}>
        <MemoryRouter>
          <SearchBarAnnotationsFilter />
        </MemoryRouter>
      </Provider>
    );

    // Test second render and effect
    expect(container.find(Checkbox).exists()).toBe(true);
    expect(container.find(Checkbox).prop('checked')).toBe(true);
    container.find('input').simulate('change', { target: { checked: false } });
    expect(mockFunction).toBeCalled();
  });
});
