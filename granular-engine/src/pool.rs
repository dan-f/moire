use std::{
    cell::RefCell,
    ops::{Deref, DerefMut},
};

pub struct Pool<T> {
    items: Vec<T>,
    free_list: RefCell<Vec<usize>>,
}

pub trait PoolItem: Clone + Default {
    fn occupied(&self) -> bool;
    fn free(&mut self);
}

impl<T: PoolItem> Pool<T> {
    pub fn new(capacity: usize) -> Self {
        Self {
            items: vec![Default::default(); capacity],
            free_list: RefCell::new((0..capacity).collect()),
        }
    }

    pub fn reset(&mut self) {
        for mut entry in self.entries() {
            entry.free();
        }
    }

    pub fn add(&mut self, item: T) -> Option<usize> {
        if let Some(i) = self.free_list.borrow_mut().pop() {
            self.items[i] = item;
            Some(i)
        } else {
            None
        }
    }

    pub fn get_entry(&mut self, idx: usize) -> Option<PoolEntry<'_, T>> {
        let item = self
            .items
            .get_mut(idx)
            .and_then(|i| if i.occupied() { Some(i) } else { None })?;
        Some(PoolEntry {
            free_list: &self.free_list,
            item,
            idx,
        })
    }

    pub fn entries(&mut self) -> impl Iterator<Item = PoolEntry<'_, T>> {
        self.items.iter_mut().enumerate().filter_map(|(idx, item)| {
            if item.occupied() {
                Some(PoolEntry {
                    free_list: &self.free_list,
                    item,
                    idx,
                })
            } else {
                None
            }
        })
    }
}

pub struct PoolEntry<'a, T> {
    free_list: &'a RefCell<Vec<usize>>,
    item: &'a mut T,
    idx: usize,
}

impl<'a, T: PoolItem> PoolEntry<'a, T> {
    pub fn free(&mut self) {
        self.item.free();
        self.free_list.borrow_mut().push(self.idx);
    }

    pub fn item(&mut self) -> &mut T {
        self.item
    }
}

impl<'a, T> Deref for PoolEntry<'a, T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        self.item
    }
}

impl<'a, T> DerefMut for PoolEntry<'a, T> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        self.item
    }
}

#[cfg(test)]

mod tests {
    use super::*;

    type Item = Option<bool>;

    impl PoolItem for Item {
        fn occupied(&self) -> bool {
            self.is_some()
        }

        fn free(&mut self) {
            self.take();
        }
    }

    impl<T: PoolItem> Pool<T> {
        fn get_mut(&mut self, idx: usize) -> Option<&mut T> {
            self.items
                .get_mut(idx)
                .and_then(|i| if i.occupied() { Some(i) } else { None })
        }
    }

    #[test]
    fn test_entry_mgmt() {
        let mut pool: Pool<Item> = Pool::new(2);
        assert!(pool.items.iter().all(|i| !i.occupied()));
        assert!(pool.free_list.borrow().eq(&vec![0, 1]));

        // Add one item, half occupied
        let mut item_1 = Some(true);
        let idx_1 = pool.add(item_1).unwrap();
        assert_eq!(Some(&mut item_1), pool.get_mut(idx_1));
        assert!(pool.free_list.borrow().eq(&vec![0]));

        // Add another item, fully occupied
        let mut item_2 = Some(true);
        let idx_2 = pool.add(item_2).unwrap();
        assert_eq!(Some(&mut item_2), pool.get_mut(idx_2),);
        assert!(pool.free_list.borrow().is_empty());

        // Try adding a third item, addition rejected
        let item_3 = Some(true);
        assert_eq!(None, pool.add(item_3));
        assert!(pool.free_list.borrow().is_empty());

        // Free first item, entry opens up
        pool.get_entry(idx_1).unwrap().free();
        assert!(pool.get_mut(idx_1).is_none());
        assert!(pool.free_list.borrow().eq(&vec![idx_1]));

        // Free second item, entry opens up
        pool.get_entry(idx_2).unwrap().free();
        assert!(pool.get_mut(idx_2).is_none());
        assert!(pool.free_list.borrow().eq(&vec![idx_1, idx_2]));

        // All slots free again
        assert!(pool.items.iter().all(|e| !e.occupied()));
    }
}
