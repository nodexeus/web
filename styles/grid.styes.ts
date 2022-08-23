import { css } from '@emotion/react'
import { breakpoints } from './variables.styles'

/**
 * Display grid
 */

export const grid = css`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-column-gap: 20px;
  grid-auto-rows: min-content;
  max-width: 1720px;

  @media ${breakpoints.fromSml} {
    grid-template-columns: repeat(12, 1fr);
    grid-column-gap: 40px;
  }
`