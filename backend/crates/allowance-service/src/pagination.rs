//! Shared pagination-clamping logic for list-style service queries.

pub const MAX_PER_PAGE: i64 = 100;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Pagination {
    pub page: i64,
    pub per_page: i64,
    pub offset: i64,
}

/// Clamps `per_page` to `MAX_PER_PAGE` (minimum 1) and `page` to a minimum of 1,
/// then derives the row offset from the clamped values.
pub fn clamp(page: i64, per_page: i64) -> Pagination {
    let page = page.max(1);
    let per_page = per_page.clamp(1, MAX_PER_PAGE);
    let offset = (page - 1) * per_page;

    Pagination {
        page,
        per_page,
        offset,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamp_leaves_valid_page_and_per_page_unchanged() {
        let pagination = clamp(2, 25);
        assert_eq!(pagination.page, 2);
        assert_eq!(pagination.per_page, 25);
        assert_eq!(pagination.offset, 25);
    }

    #[test]
    fn clamp_raises_page_below_one_to_one() {
        let pagination = clamp(0, 25);
        assert_eq!(pagination.page, 1);
        assert_eq!(pagination.offset, 0);
    }

    #[test]
    fn clamp_raises_negative_page_to_one() {
        let pagination = clamp(-5, 25);
        assert_eq!(pagination.page, 1);
        assert_eq!(pagination.offset, 0);
    }

    #[test]
    fn clamp_caps_per_page_above_max_to_max() {
        let pagination = clamp(1, 9999);
        assert_eq!(pagination.per_page, MAX_PER_PAGE);
    }

    #[test]
    fn clamp_raises_per_page_below_one_to_one() {
        let pagination = clamp(1, 0);
        assert_eq!(pagination.per_page, 1);
    }

    #[test]
    fn clamp_computes_offset_for_later_pages() {
        let pagination = clamp(3, 10);
        assert_eq!(pagination.offset, 20);
    }
}
