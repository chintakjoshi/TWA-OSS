import type { PaginatedResponse } from '../types/admin'

export async function loadAllPages<T>(
  loadPage: (page: number) => Promise<PaginatedResponse<T>>
) {
  const items: T[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const response = await loadPage(page)
    items.push(...response.items)
    totalPages = response.meta.total_pages
    page += 1
  }

  return items
}
