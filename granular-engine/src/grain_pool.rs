use crate::{
    grain::Grain,
    pool::{Pool, PoolEntry},
};

pub type GrainPool = Pool<Grain>;

/// Tick a grain pool entry, freeing it when we've ticked all the way through
pub fn tick<'a>(mut entry: PoolEntry<'a, Grain>) -> Option<PoolEntry<'a, Grain>> {
    if entry.tick() {
        Some(entry)
    } else {
        entry.free();
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use crate::{env::Env, grain_pool::GrainPool};

    #[test]
    fn ticking_through_entry() {
        let mut pool = GrainPool::new(1);
        let idx = pool
            .add(Grain::new(0, 0., 1., 1., 1., 0.5, Env::None))
            .unwrap();

        let entry = pool.get_entry(idx).unwrap();
        tick(entry).and_then(tick);

        assert!(pool.entries().all(|e| !e.alive()));
        assert!(pool.get_entry(idx).is_none());
    }
}
