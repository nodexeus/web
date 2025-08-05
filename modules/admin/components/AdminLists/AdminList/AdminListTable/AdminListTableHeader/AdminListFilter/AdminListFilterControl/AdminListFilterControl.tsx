import { css } from '@emotion/react';
import { Checkbox, Scrollbar, Button } from '@shared/components';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { AdminListFilterSearch } from './AdminListFilterSearch/AdminListFilterSearch';
import { styles } from './AdminListFilterControl.styles';
import { AdminFilterControlProps } from '@modules/admin/types/AdminFilterControlProps';

export const AdminListFilterControl = ({
  isOpen,
  columnName,
  items,
  values,
  onFilterChange,
  onReset,
  isLoading = false,
  error = null,
  onRetry,
  // Enhanced state handling props
  isApplyingFilter = false,
  filterOperationId,
  showSuccessFeedback = false,
  successMessage,
  onClearAll,
  maxSelections,
  allowedValues,
  validationErrors = [],
}: AdminFilterControlProps) => {
  const [search, setSearch] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset local error when external error changes
  useEffect(() => {
    if (error !== localError) {
      setLocalError(error);
    }
  }, [error, localError]);

  // Reset processing state when filter operation completes
  useEffect(() => {
    if (!isApplyingFilter && isProcessing) {
      setIsProcessing(false);
    }
  }, [isApplyingFilter, isProcessing]);

  const handleSearch = useCallback(
    (s: string) => {
      setSearch(s);
      // Clear any previous local errors when user interacts
      if (localError) {
        setLocalError(null);
      }
    },
    [localError],
  );

  const handleReset = useCallback(() => {
    if (onReset && !isLoading && !isApplyingFilter) {
      setIsProcessing(true);
      setLocalError(null);
      try {
        onReset(columnName);
      } catch (err) {
        setLocalError(
          err instanceof Error ? err.message : 'Failed to reset filter',
        );
        setIsProcessing(false);
      }
    }
  }, [onReset, columnName, isLoading, isApplyingFilter]);

  const handleClearAll = useCallback(() => {
    if (onClearAll && !isLoading && !isApplyingFilter) {
      setIsProcessing(true);
      setLocalError(null);
      try {
        onClearAll();
      } catch (err) {
        setLocalError(
          err instanceof Error ? err.message : 'Failed to clear all filters',
        );
        setIsProcessing(false);
      }
    }
  }, [onClearAll, isLoading, isApplyingFilter]);

  const handleRetry = useCallback(() => {
    if (onRetry) {
      setLocalError(null);
      setIsProcessing(true);
      try {
        onRetry();
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : 'Retry failed');
        setIsProcessing(false);
      }
    }
  }, [onRetry]);

  const handleFilterChange = useCallback(
    (item: AdminFilterDropdownItem) => {
      if (isLoading || isApplyingFilter) return;

      // Validate against max selections
      if (
        maxSelections &&
        values &&
        values.length >= maxSelections &&
        !values.includes(item.id || '')
      ) {
        setLocalError(`Maximum ${maxSelections} selections allowed`);
        return;
      }

      // Validate against allowed values
      if (allowedValues && item.id && !allowedValues.includes(item.id)) {
        setLocalError(`"${item.name}" is not a valid filter option`);
        return;
      }

      setIsProcessing(true);
      setLocalError(null);

      try {
        onFilterChange(item);
      } catch (err) {
        setLocalError(
          err instanceof Error ? err.message : 'Failed to apply filter',
        );
        setIsProcessing(false);
      }
    },
    [
      onFilterChange,
      isLoading,
      isApplyingFilter,
      maxSelections,
      values,
      allowedValues,
    ],
  );

  const filteredItems = useMemo(
    () =>
      items?.filter(
        (item) =>
          search === '' ||
          item.name?.toLowerCase()?.includes(search.toLocaleLowerCase()),
      ),
    [search, items],
  );

  const hasActiveFilters = values && values.length > 0;
  const isDisabled = isLoading || isApplyingFilter || isProcessing;
  const currentError = localError || error;

  // Success feedback state
  if (showSuccessFeedback && successMessage) {
    return (
      <div css={styles.successFeedback}>
        <span>{successMessage}</span>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div css={styles.loadingContainer}>
        <div css={styles.loadingSpinner} />
        <span css={styles.loadingText}>
          {isApplyingFilter ? 'Applying filter...' : 'Loading filters...'}
        </span>
      </div>
    );
  }

  // Error state
  if (currentError) {
    return (
      <div css={styles.errorContainer}>
        <div css={styles.errorMessage}>
          <span css={styles.errorText}>
            {localError ? 'Filter Error' : 'Failed to load filter options'}
          </span>
          <span css={styles.errorDetails}>{currentError}</span>
        </div>
        {validationErrors.length > 0 && (
          <div css={styles.errorMessage}>
            <span css={styles.errorText}>Validation Errors:</span>
            {validationErrors.map((validationError, index) => (
              <span key={index} css={styles.errorDetails}>
                • {validationError}
              </span>
            ))}
          </div>
        )}
        {onRetry && !localError && (
          <Button
            onClick={handleRetry}
            size="small"
            style="outline"
            css={styles.retryButton}
            disabled={isProcessing}
          >
            {isProcessing ? 'Retrying...' : 'Retry'}
          </Button>
        )}
      </div>
    );
  }

  // Empty state
  if (!items || items.length === 0) {
    return (
      <div css={styles.emptyContainer}>
        <span css={styles.emptyText}>No filter options available</span>
      </div>
    );
  }

  return (
    <>
      <AdminListFilterSearch onSearch={handleSearch} shouldAutoFocus={isOpen} />

      {/* Show processing indicator */}
      {(isApplyingFilter || isProcessing) && (
        <div css={styles.loadingContainer}>
          <div css={styles.loadingSpinner} />
          <span css={styles.loadingText}>
            {isApplyingFilter ? 'Applying filter...' : 'Processing...'}
          </span>
        </div>
      )}

      <Scrollbar additionalStyles={[styles.scrollbar]}>
        <ul>
          {filteredItems?.map((item) => {
            const key = `${columnName}-${item.id}-${item.name}`;
            const isChecked = values?.some((value) => value === item.id);
            const isItemDisabled =
              isDisabled ||
              (allowedValues && item.id && !allowedValues.includes(item.id));

            return (
              <li
                css={[
                  styles.item,
                  isItemDisabled && styles.itemDisabled,
                  (isApplyingFilter || isProcessing) && styles.itemLoading,
                ]}
                key={key}
              >
                <Checkbox
                  id={key}
                  checked={isChecked}
                  name={item.name!}
                  onChange={() => handleFilterChange(item)}
                  disabled={isItemDisabled}
                  additionalStyles={[
                    css`
                      flex: 1 1 auto;
                      padding: 6px 20px 6px 10px;
                      opacity: ${isItemDisabled ? 0.5 : 1};
                      transition: opacity 0.2s ease;
                    `,
                  ]}
                >
                  {item.name}
                  {maxSelections &&
                    values &&
                    values.length >= maxSelections &&
                    !isChecked && (
                      <span
                        css={css`
                          font-size: 10px;
                          color: rgb(255 255 255 / 40%);
                          margin-left: 4px;
                        `}
                      >
                        (max reached)
                      </span>
                    )}
                </Checkbox>
              </li>
            );
          })}
        </ul>
      </Scrollbar>

      {/* Filter actions */}
      <div css={styles.actionsContainer}>
        <div
          css={css`
            display: flex;
            gap: 8px;
          `}
        >
          {hasActiveFilters && onReset && (
            <Button
              onClick={handleReset}
              size="small"
              style="outline"
              disabled={isDisabled}
              css={styles.resetButton}
            >
              {isProcessing ? 'Clearing...' : 'Clear Filter'}
            </Button>
          )}
          {onClearAll && (
            <Button
              onClick={handleClearAll}
              size="small"
              style="outline"
              disabled={isDisabled}
              css={styles.resetButton}
            >
              {isProcessing ? 'Clearing...' : 'Clear All'}
            </Button>
          )}
        </div>

        <div
          css={css`
            display: flex;
            flex-direction: column;
            align-items: flex-end;
          `}
        >
          {filteredItems && filteredItems.length > 0 && (
            <div css={styles.filterCount}>
              {hasActiveFilters
                ? `${values!.length} selected`
                : 'None selected'}
              {maxSelections && (
                <span
                  css={css`
                    margin-left: 4px;
                    opacity: 0.7;
                  `}
                >
                  (max: {maxSelections})
                </span>
              )}
            </div>
          )}
          {validationErrors.length > 0 && (
            <div
              css={css`
                font-size: 10px;
                color: rgb(220 38 38);
                margin-top: 2px;
              `}
            >
              {validationErrors.length} validation error
              {validationErrors.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
