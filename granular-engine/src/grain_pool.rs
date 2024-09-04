use std::{
    cell::RefCell,
    ops::{Deref, DerefMut},
};

use crate::grain::Grain;

pub struct GrainPool {
    grains: Vec<Grain>,
    free_list: RefCell<Vec<usize>>,
}

impl GrainPool {
    pub fn new(capacity: usize) -> Self {
        Self {
            grains: vec![Default::default(); capacity],
            free_list: RefCell::new((0..capacity).collect()),
        }
    }

    pub fn reset(&mut self) {
        for mut entry in self.entries_mut() {
            entry.free();
        }
    }

    pub fn add(&mut self, grain: Grain) -> Option<usize> {
        if let Some(i) = self.free_list.borrow_mut().pop() {
            self.grains[i] = grain;
            Some(i)
        } else {
            None
        }
    }

    pub fn entries_mut(&mut self) -> impl Iterator<Item = GrainPoolEntry> {
        self.grains
            .iter_mut()
            .enumerate()
            .filter_map(|(idx, grain)| {
                if grain.alive() {
                    Some(GrainPoolEntry {
                        free_list: &self.free_list,
                        grain,
                        idx,
                    })
                } else {
                    None
                }
            })
    }
}

pub struct GrainPoolEntry<'a> {
    free_list: &'a RefCell<Vec<usize>>,
    grain: &'a mut Grain,
    idx: usize,
}

impl<'a> GrainPoolEntry<'a> {
    pub fn free(&mut self) {
        self.grain.complete();
        self.free_list.borrow_mut().push(self.idx);
    }

    pub fn tick(&mut self) {
        if !self.grain.tick() {
            self.free();
        }
    }
}

impl<'a> Deref for GrainPoolEntry<'a> {
    type Target = Grain;

    fn deref(&self) -> &Self::Target {
        self.grain
    }
}

impl<'a> DerefMut for GrainPoolEntry<'a> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        self.grain
    }
}

#[cfg(test)]
mod tests {
    use crate::grain::Grain;

    use super::*;

    impl GrainPool {
        pub fn get_mut(&mut self, idx: usize) -> Option<&mut Grain> {
            GrainPool::mut_grain(&mut self.grains, idx)
        }

        pub fn get_mut_entry(&mut self, idx: usize) -> Option<GrainPoolEntry> {
            let grain = GrainPool::mut_grain(&mut self.grains, idx)?;
            Some(GrainPoolEntry {
                free_list: &self.free_list,
                grain,
                idx,
            })
        }

        fn mut_grain(grains: &mut Vec<Grain>, idx: usize) -> Option<&mut Grain> {
            grains
                .get_mut(idx)
                .and_then(|g| if g.alive() { Some(g) } else { None })
        }
    }

    #[test]
    fn test_entry_mgmt() {
        let mut pool = GrainPool::new(2);
        assert!(pool.grains.iter().all(|g| !g.alive()));
        assert!(pool.free_list.borrow().eq(&vec![0, 1]));

        // Add one grain, half occupied
        let mut grain_1 = Grain::new(0., 1., 1., 0.5);
        let idx_1 = pool.add(grain_1).unwrap();
        assert_eq!(Some(&mut grain_1), pool.get_mut(idx_1));
        assert!(pool.free_list.borrow().eq(&vec![0]));

        // Add another grain, fully occupied
        let mut grain_2 = Grain::new(1., 2., 1., 0.5);
        let idx_2 = pool.add(grain_2).unwrap();
        assert_eq!(Some(&mut grain_2), pool.get_mut(idx_2),);
        assert!(pool.free_list.borrow().is_empty());

        // Try adding a third grain, addition rejected
        let grain_3 = Grain::new(3., 4., 1., 0.5);
        assert_eq!(None, pool.add(grain_3));
        assert!(pool.free_list.borrow().is_empty());

        // Free first grain, entry opens up
        pool.get_mut_entry(idx_1).unwrap().free();
        assert!(pool.get_mut(idx_1).is_none());
        assert!(pool.free_list.borrow().eq(&vec![idx_1]));

        // Free second grain, entry opens up
        pool.get_mut_entry(idx_2).unwrap().free();
        assert!(pool.get_mut(idx_2).is_none());
        assert!(pool.free_list.borrow().eq(&vec![idx_1, idx_2]));

        // All slots free again
        assert!(pool.grains.iter().all(|e| !e.alive()));
    }

    #[test]
    fn test_ticking_through_entry() {
        let mut pool = GrainPool::new(1);
        let idx = pool.add(Grain::new(0., 1., 1., 0.5)).unwrap();

        let mut entry = pool.get_mut_entry(idx).unwrap();
        entry.tick();
        entry.tick();

        assert!(pool.grains.iter().all(|e| !e.alive()));
        assert!(pool.get_mut_entry(idx).is_none());
    }
}
