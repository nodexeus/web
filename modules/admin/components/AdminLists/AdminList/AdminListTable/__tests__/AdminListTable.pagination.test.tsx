import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminListTable } from '../AdminListTable';
import { SortOrder } from '../../../../../../../generated/blockjoy/common/v1/search';
import { AdminListColumn } from '../../../../types/AdminListColumn';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { beforeEach } from 'vitest';
import { describe } from 'vitest';

// Mock the theme provider
jest.mock('@modules/theme', () => ({
  useTheme: () => ({
    colorBackground: '#000',
    colorBorder: '#333',
    colorDefault: '#fff',
    colorPrimary: '#007bff',
  }),
}));

// Mock the router
jest.mock('next/router', () => ({
  useRouter: () => ({
    query: {},
    push: jest.fn(),
    pathname: '/admin',
  }),
}));

// Mock shared components
jest.mock('@shared/components', () => ({
  Checkbox: ({ checked, name }: any) => (
    <input type="checkbox" checked={checked} name={name} readOnly />
  ),
  Copy: ({ value }: any) => <span>Copy: {value}</span>,
  TableSkeleton: () => <div>Loading...</div>,
}));

describe('AdminListTable Pagination', () => {
  const mockColumns: AdminListColumn[] = [
    {
      name: 'id',
      displayName: 'ID',
      width: '100px',
      isVisible: true,
      sortField: 1,
    },
    {
      name: 'name',
      displayName: 'Name',
      width: '200px',
      isVisible: true,
      sortField: 2,
    },
  ];

  const mockList = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
  ];

  const defaultProps = {
    name: 'test',
    idPropertyName: 'id',
    isLoading: false,
    columns: mockColumns,
    list: mockList,
    listTotal: 100,
    listPage: 1,
    listPageSize: 24,
    listAll: mockList,
    activeSortField: 1,
    activeSortOrder: SortOrder.SORT_ORDER_ASCENDING,
    onPageChanged: jest.fn(),
    onSortChanged: jest.fn(),
    onFiltersChanged: jest.fn(),
    onColumnsChanged: jest.fn(),
    onPageSizeChanged: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render page size selector with correct current value', () => {
    render(<AdminListTable {...defaultProps} />);

    const pageSizeSelect = screen.getByLabelText(
      'Select number of items per page',
    );
    expect(pageSizeSelect).toBeInTheDocument();
    expect(pageSizeSelect).toHaveValue('24');
  });

  it('should call onPageSizeChanged when page size is changed', async () => {
    const onPageSizeChanged = jest.fn();
    render(
      <AdminListTable
        {...defaultProps}
        onPageSizeChanged={onPageSizeChanged}
      />,
    );

    const pageSizeSelect = screen.getByLabelText(
      'Select number of items per page',
    );
    fireEvent.change(pageSizeSelect, { target: { value: '50' } });

    await waitFor(() => {
      expect(onPageSizeChanged).toHaveBeenCalledWith(50);
    });
  });

  it('should disable page size selector when loading', () => {
    render(<AdminListTable {...defaultProps} isLoading={true} />);

    const pageSizeSelect = screen.getByLabelText(
      'Select number of items per page',
    );
    expect(pageSizeSelect).toBeDisabled();
  });

  it('should not call onPageSizeChanged for invalid values', async () => {
    const onPageSizeChanged = jest.fn();
    render(
      <AdminListTable
        {...defaultProps}
        onPageSizeChanged={onPageSizeChanged}
      />,
    );

    const pageSizeSelect = screen.getByLabelText(
      'Select number of items per page',
    );

    // Try to set an invalid value (this shouldn't happen in normal usage, but test edge case)
    fireEvent.change(pageSizeSelect, { target: { value: 'invalid' } });

    await waitFor(() => {
      expect(onPageSizeChanged).not.toHaveBeenCalled();
    });
  });

  it('should display correct pagination controls', () => {
    render(<AdminListTable {...defaultProps} />);

    // Should show pagination controls
    expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to next page')).toBeInTheDocument();
  });

  it('should disable pagination controls when loading', () => {
    render(<AdminListTable {...defaultProps} isLoading={true} />);

    const prevButton = screen.getByLabelText('Go to previous page');
    const nextButton = screen.getByLabelText('Go to next page');

    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
  });

  it('should display correct row count information', () => {
    render(<AdminListTable {...defaultProps} />);

    // Should show row count (1 to 24 of 100)
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should calculate correct page count', () => {
    // With 100 total items and 24 per page, should have 5 pages (Math.ceil(100/24) = 5)
    render(
      <AdminListTable {...defaultProps} listTotal={100} listPageSize={24} />,
    );

    // The pagination component should show page numbers
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should handle empty list correctly', () => {
    render(
      <AdminListTable
        {...defaultProps}
        list={[]}
        listTotal={0}
        listPageSize={24}
      />,
    );

    expect(screen.getByText('No test found.')).toBeInTheDocument();
    // Pagination should not be shown for empty lists
    expect(
      screen.queryByLabelText('Go to previous page'),
    ).not.toBeInTheDocument();
  });

  it('should reflect page size changes in pagination calculations', () => {
    const { rerender } = render(
      <AdminListTable {...defaultProps} listPageSize={10} />,
    );

    // With 100 items and 10 per page, should show "1 to 10 of 100"
    expect(screen.getByText('10')).toBeInTheDocument();

    // Change page size to 50
    rerender(<AdminListTable {...defaultProps} listPageSize={50} />);

    // Should now show "1 to 50 of 100"
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('should not render page size selector when onPageSizeChanged is not provided', () => {
    const { onPageSizeChanged, ...propsWithoutPageSizeHandler } = defaultProps;
    render(<AdminListTable {...propsWithoutPageSizeHandler} />);

    expect(
      screen.queryByLabelText('Select number of items per page'),
    ).not.toBeInTheDocument();
  });

  it('should hide pagination when hidePagination is true', () => {
    render(<AdminListTable {...defaultProps} hidePagination={true} />);

    expect(
      screen.queryByLabelText('Go to previous page'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Select number of items per page'),
    ).not.toBeInTheDocument();
  });
});
