/**
 * Boards (Projects) domain barrel export.
 *
 * Usage:
 *   import { boardsApi } from '../api/boards'
 *   const boards = await boardsApi.getBoards()
 */

export {
  getBoards,
  createBoard,
  updateBoard,
  switchBoard,
  deleteBoard,
  exportBoardArchive,
  exportBoardJson,
  importBoardJson,
} from './boards.api'

import * as boards from './boards.api'

export const boardsApi = {
  ...boards
}
