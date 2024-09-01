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

    pub fn channel(&self, chan_idx: usize) -> &[f32] {
        &self.data[chan_idx]
    }

    pub fn frame(&self, i: usize) -> [f32; C] {
        let mut frame = [0.; C];
        for channel in 0..C {
            frame[channel] = self.data[channel][i];
        }
        frame
    }

    pub fn write_frame(&mut self, i: usize, frame: &[f32; C]) {
        for (dst_channel, src_sample) in self.data.iter_mut().zip(frame.iter()) {
            dst_channel[i] = *src_sample;
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

pub type StereoBuffer = Buffer<2>;
