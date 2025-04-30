import { FC } from 'react';
import { css } from '@emotion/react';
import { pageSizeOptions } from '@modules/admin/constants/constants';
import Head from 'next/head';

type Props = {
  currentPageSize: number;
  onPageSizeChange: (pageSize: number) => void;
};

export const PageSizeSelector: FC<Props> = ({
  currentPageSize,
  onPageSizeChange,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onPageSizeChange(Number(e.target.value));
  };

  const containerStyle = css`
    display: flex;
    align-items: center;
    margin-right: 16px;
  `;

  // A unique class for our selector to avoid conflicts
  const pageSelectClass = 'page-size-selector-dropdown';
  const pageLabelClass = 'page-size-selector-label';

  return (
    <>
      <Head>
        <style>{`
          .${pageSelectClass} {
            padding: 4px 8px !important;
            border-radius: 4px !important;
            border: 1px solid #363938 !important;
            background-color: #222524 !important;
            color: #5f615d !important;
            cursor: pointer !important;
            font-size: 12px !important;
          }
          
          .${pageSelectClass} option {
            background-color: #222524 !important;
            color: #5f615d !important;
          }
          
          .${pageLabelClass} {
            margin-right: 8px !important;
            font-size: 12px !important;
            white-space: nowrap !important;
            color: #5f615d !important;
          }
        `}</style>
      </Head>
      <div css={containerStyle}>
        <label className={pageLabelClass}>Items per page:</label>
        <select
          className={pageSelectClass}
          value={currentPageSize}
          onChange={handleChange}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </>
  );
};
