use std::array;

pub struct Buffer<const C: usize> {
    pub len: usize,
    pub data: [Vec<f32>; C],
}

impl<const C: usize> Buffer<C> {
    pub fn new(len: usize) -> Self {
        Self::new_with_capacity(len, len)
    }

    pub fn new_with_capacity(len: usize, capacity: usize) -> Self {
        assert!(C > 0);
        assert!(capacity >= len);
        Self {
            len,
            data: array::from_fn(|_| vec![0.; capacity]),
        }
    }

    pub fn channel(&self, channel: usize) -> &[f32] {
        &self.data[channel]
    }

    pub fn channel_mut(&mut self, channel: usize) -> &mut [f32] {
        &mut self.data[channel]
    }

    pub fn iter(&self, channel: usize) -> impl Iterator<Item = &f32> {
        self.channel(channel).iter().take(self.len)
    }

    pub fn iter_mut(&mut self, channel: usize) -> impl Iterator<Item = &mut f32> {
        let len = self.len;
        self.channel_mut(channel).iter_mut().take(len)
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

pub type StereoBuffer = Buffer<2>;

impl StereoBuffer {
    pub fn iter_l(&self) -> impl Iterator<Item = &f32> {
        self.iter(0)
    }

    pub fn iter_r(&self) -> impl Iterator<Item = &f32> {
        self.iter(1)
    }

    pub fn iter_l_mut(&mut self) -> impl Iterator<Item = &mut f32> {
        self.iter_mut(0)
    }

    pub fn iter_r_mut(&mut self) -> impl Iterator<Item = &mut f32> {
        self.iter_mut(1)
    }
}
