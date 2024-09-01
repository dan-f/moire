use std::{
    cell::RefCell,
    ops::{Deref, DerefMut},
};

use crate::{buffer::StereoBuffer, grain::Grain};

pub struct GrainPool {
    entries: Vec<GrainEntry>,
    free_list: RefCell<Vec<usize>>,
}

impl GrainPool {
    pub fn new(capacity: usize) -> Self {
        Self {
            entries: vec![Default::default(); capacity],
            free_list: RefCell::new((0..capacity).collect()),
        }
    }

    pub fn add(&mut self, grain: Grain) -> Option<usize> {
        if let Some(i) = self.free_list.borrow_mut().pop() {
            self.entries[i].revive(grain);
            Some(i)
        } else {
            None
        }
    }

    pub fn handles_mut(&mut self) -> impl Iterator<Item = GrainPoolHandle> {
        self.entries
            .iter_mut()
            .enumerate()
            .filter_map(|(idx, entry)| {
                if let GrainEntry::Live(_) = entry {
                    Some(GrainPoolHandle {
                        free_list: &self.free_list,
                        entry,
                        idx,
                    })
                } else {
                    None
                }
            })
    }
}

pub struct GrainPoolHandle<'a> {
    free_list: &'a RefCell<Vec<usize>>,
    entry: &'a mut GrainEntry,
    idx: usize,
}

impl<'a> GrainPoolHandle<'a> {
    pub fn free(&mut self) {
        self.entry.free();
        self.free_list.borrow_mut().push(self.idx);
    }

    pub fn tick(&mut self) {
        if let Some(still_alive) = self.entry.tick() {
            if !still_alive {
                self.free();
            }
        }
    }
}

impl<'a> Deref for GrainPoolHandle<'a> {
    type Target = GrainEntry;

    fn deref(&self) -> &Self::Target {
        self.entry
    }
}

impl<'a> DerefMut for GrainPoolHandle<'a> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        self.entry
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum GrainEntry {
    Live(Grain),
    Free,
}

impl GrainEntry {
    pub fn render_frame(&self, sample: &StereoBuffer) -> [f32; 2] {
        match self {
            Self::Live(grain) => grain.render_frame(sample),
            Self::Free => [0., 0.],
        }
    }

    pub fn tick(&mut self) -> Option<bool> {
        if let GrainEntry::Live(grain) = self {
            let still_live = grain.tick();
            if !still_live {
                self.free();
            }
            Some(still_live)
        } else {
            None
        }
    }

    pub fn revive(&mut self, grain: Grain) {
        if let Self::Free = self {
            *self = Self::Live(grain);
        }
    }

    fn free(&mut self) {
        *self = Self::Free;
    }
}

impl Default for GrainEntry {
    fn default() -> Self {
        Self::Free
    }
}

#[cfg(test)]
mod tests {
    use crate::grain::Grain;

    use super::*;

    impl GrainPool {
        fn get_mut_handle(&mut self, idx: usize) -> Option<GrainPoolHandle> {
            self.entries.get_mut(idx).and_then(|entry| {
                if let GrainEntry::Live(_) = entry {
                    Some(GrainPoolHandle {
                        free_list: &self.free_list,
                        entry,
                        idx,
                    })
                } else {
                    None
                }
            })
        }
    }

    impl GrainEntry {
        fn is_live(&self) -> bool {
            matches!(self, Self::Live(_))
        }
    }

    #[test]
    fn test_entry_mgmt() {
        let mut pool = GrainPool::new(2);
        assert!(pool.entries.iter().all(|e| !e.is_live()));
        assert!(pool.free_list.borrow().eq(&vec![0, 1]));

        // Add one grain, half occupied
        let grain_1 = Grain::new(0, 1);
        let idx_1 = pool.add(grain_1).unwrap();
        assert_eq!(
            Some(&mut GrainEntry::Live(grain_1)),
            pool.get_mut_handle(idx_1).map(|h| h.entry)
        );
        assert!(pool.free_list.borrow().eq(&vec![0]));

        // Add another grain, fully occupied
        let grain_2 = Grain::new(1, 2);
        let idx_2 = pool.add(grain_2).unwrap();
        assert_eq!(
            Some(&mut GrainEntry::Live(grain_2)),
            pool.get_mut_handle(idx_2).map(|h| h.entry)
        );
        assert!(pool.free_list.borrow().is_empty());

        // Try adding a third grain, addition rejected
        let grain_3 = Grain::new(3, 4);
        assert_eq!(None, pool.add(grain_3));
        assert!(pool.free_list.borrow().is_empty());

        // Free first grain, entry opens up
        pool.get_mut_handle(idx_1).unwrap().free();
        assert!(pool.get_mut_handle(idx_1).is_none());
        assert!(pool.free_list.borrow().eq(&vec![idx_1]));

        // Free second grain, entry opens up
        pool.get_mut_handle(idx_2).unwrap().free();
        assert!(pool.get_mut_handle(idx_2).is_none());
        assert!(pool.free_list.borrow().eq(&vec![idx_1, idx_2]));

        // All slots free again
        assert!(pool.entries.iter().all(|e| !e.is_live()));
    }

    #[test]
    fn test_ticking_through_handle() {
        let mut pool = GrainPool::new(1);
        let idx = pool.add(Grain::new(0, 1)).unwrap();

        let mut handle = pool.get_mut_handle(idx).unwrap();
        handle.tick();

        assert!(pool.entries.iter().all(|e| !e.is_live()));
        assert!(pool.get_mut_handle(idx).is_none());
    }
}
