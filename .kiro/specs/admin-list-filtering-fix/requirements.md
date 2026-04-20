# Requirements Document

## Introduction

The admin node list page (/admin?name=nodes&page=1) has two critical issues affecting user experience: column filters often fail to apply properly requiring multiple page refreshes, and the items per page selector doesn't work consistently, always defaulting to 24 items regardless of user selection. These issues prevent administrators from efficiently managing and viewing node data, impacting operational workflows.

## Requirements

### Requirement 1

**User Story:** As an administrator, I want column filters to apply immediately and reliably when I select filter options, so that I can quickly find specific nodes without having to refresh the page multiple times.

#### Acceptance Criteria

1. WHEN an administrator selects a filter option from any column dropdown THEN the system SHALL apply the filter immediately without requiring a page refresh
2. WHEN multiple filters are applied simultaneously THEN the system SHALL correctly combine all filter criteria and display matching results
3. WHEN a filter is cleared or reset THEN the system SHALL immediately remove the filter and refresh the results
4. WHEN the page is loaded with existing filter parameters in the URL THEN the system SHALL automatically apply those filters on initial load
5. IF a filter operation fails THEN the system SHALL display an appropriate error message and maintain the previous filter state

### Requirement 2

**User Story:** As an administrator, I want the items per page selector to work consistently, so that I can control how many nodes are displayed per page according to my preference.

#### Acceptance Criteria

1. WHEN an administrator selects a different page size from the dropdown THEN the system SHALL immediately update the display to show the selected number of items
2. WHEN the page size is changed THEN the system SHALL reset to page 1 and recalculate the total number of pages
3. WHEN the page is refreshed or navigated away and back THEN the system SHALL remember the selected page size preference
4. WHEN the page size setting is saved THEN the system SHALL persist this preference for future admin sessions
5. IF the selected page size would result in an empty page THEN the system SHALL automatically navigate to the last valid page with content

### Requirement 3

**User Story:** As an administrator, I want the filtering and pagination state to be properly synchronized with the URL, so that I can bookmark specific filtered views and share them with other administrators.

#### Acceptance Criteria

1. WHEN filters are applied THEN the system SHALL update the URL to reflect the current filter state
2. WHEN pagination settings change THEN the system SHALL update the URL with the current page and page size
3. WHEN a URL with filter and pagination parameters is accessed directly THEN the system SHALL restore the exact state represented by those parameters
4. WHEN the browser back/forward buttons are used THEN the system SHALL correctly restore the previous filter and pagination state
5. WHEN sharing a filtered URL THEN other administrators SHALL see the same filtered results when accessing that URL
