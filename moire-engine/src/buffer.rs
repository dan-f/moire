use std::ops::{Index, IndexMut};

pub struct Buffer {
    pub len: usize,
    pub data: Vec<Vec<f32>>,
}

impl Buffer {
    pub fn new(channels: usize, len: usize) -> Self {
        Self::new_with_capacity(channels, len, len)
    }

    pub fn new_with_capacity(channels: usize, len: usize, capacity: usize) -> Self {
        assert!(channels > 0);
        assert!(capacity >= len);
        Self {
            len,
            data: vec![vec![0.; capacity]; channels],
        }
    }

    pub fn resize(&mut self, new_capacity: usize, new_len: usize) {
        assert!(new_capacity >= new_len);
        if new_capacity > self.capacity() {
            for chan in self.data.iter_mut() {
                chan.resize(new_capacity, 0.);
            }
        }
        self.len = new_len;
    }

    pub fn capacity(&self) -> usize {
        self.data[0].len()
    }
}

impl Index<usize> for Buffer {
    type Output = [f32];

    fn index(&self, index: usize) -> &Self::Output {
        &self.data[index]
    }
}

impl IndexMut<usize> for Buffer {
    fn index_mut(&mut self, index: usize) -> &mut Self::Output {
        &mut self.data[index]
    }
}

/// Linear interpolated values for sub-sample indexing
pub fn sub_sample(channel: &[f32], i: f32) -> f32 {
    let len = channel.len();

    if i > (len - 1) as f32 {
        return 0.;
    }

    let left_i = (i.floor() as usize).max(0);
    let right_i = (i.ceil() as usize).min(len - 1);

    lerp(channel[left_i], channel[right_i], i.fract())
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
    (1. - t) * a + t * b
}
