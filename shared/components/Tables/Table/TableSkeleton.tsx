import { Skeleton } from '@shared/components';
import { styles } from './table.styles';

const ROW_PATTERNS = [
  ['30%', '20%', '15%', '25%'],
  ['25%', '30%', '10%', '20%'],
  ['35%', '15%', '20%', '15%'],
  ['20%', '25%', '25%', '20%'],
  ['30%', '20%', '15%', '25%'],
  ['25%', '30%', '10%', '20%'],
];

export const TableSkeleton = () => (
  <div css={styles.tableSkeleton}>
    {/* Header row */}
    <div css={styles.tableSkeletonRow}>
      <Skeleton width="60px" height="12px" />
      <Skeleton width="80px" height="12px" />
      <Skeleton width="50px" height="12px" />
      <Skeleton width="70px" height="12px" />
    </div>

    {/* Data rows */}
    {ROW_PATTERNS.map((widths, rowIndex) => (
      <div
        key={rowIndex}
        css={styles.tableSkeletonRow}
        style={{ opacity: 1 - rowIndex * 0.1 }}
      >
        {widths.map((width, colIndex) => (
          <Skeleton key={colIndex} width={width} height="16px" />
        ))}
      </div>
    ))}
  </div>
);
