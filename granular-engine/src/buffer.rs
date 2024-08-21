use std::array;

pub struct Buffer<const C: usize> {
    len: usize,
    channels: [Vec<f32>; C],
}

impl<const C: usize> Buffer<C> {
    pub fn new(capacity: usize, len: usize) -> Self {
        Self {
            len,
            channels: array::from_fn(|_| vec![0.; capacity]),
        }
    }

    pub fn channel(&self, channel: usize) -> &[f32] {
        &self.channels[channel]
    }

    pub fn capacity(&self) -> usize {
        self.channels[0].len()
    }

    pub fn resize(&mut self, new_capacity: usize, new_len: usize) {
        assert!(new_capacity >= new_len);
        if new_capacity > self.capacity() {
            for channel in self.channels.iter_mut() {
                channel.resize(new_capacity, 0.)
            }
        }
        self.len = new_len;
    }
}
