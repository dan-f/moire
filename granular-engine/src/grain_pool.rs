use crate::{
    grain::Grain,
    pool::{Pool, PoolEntry, PoolItem},
};

pub type GrainPool = Pool<Grain>;

impl PoolItem for Grain {
    fn occupied(&self) -> bool {
        self.alive()
    }

    fn free(&mut self) {
        self.complete()
    }
}

impl<'a> PoolEntry<'a, Grain> {
    pub fn tick(&mut self) {
        if !self.item().tick() {
            self.free();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use crate::grain_pool::GrainPool;

    #[test]
    fn test_ticking_through_entry() {
        let mut pool = GrainPool::new(1);
        let idx = pool.add(Grain::new(0., 1., 1., 1., 0.5)).unwrap();

        let mut entry = pool.get_entry(idx).unwrap();
        entry.tick();
        entry.tick();

        assert!(pool.entries().all(|e| !e.alive()));
        assert!(pool.get_entry(idx).is_none());
    }
}
