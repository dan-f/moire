use std::array;

pub struct Buffer<const C: usize> {
    pub sample_rate: usize,
    pub len: usize,
    pub data: [Vec<f32>; C],
}

impl<const C: usize> Buffer<C> {
    pub fn new(sample_rate: usize, len: usize) -> Self {
        Self::new_with_capacity(sample_rate, len, len)
    }

    pub fn new_with_capacity(sample_rate: usize, len: usize, capacity: usize) -> Self {
        assert!(C > 0);
        assert!(capacity >= len);
        Self {
            sample_rate,
            len,
            data: array::from_fn(|_| vec![0.; capacity]),
        }
    }

    pub fn channel(&self, chan_idx: usize) -> &[f32] {
        &self.data[chan_idx]
    }

    pub fn frame(&self, i: usize) -> [f32; C] {
        let mut frame = [0.; C];
        if i > self.len - 1 {
            return frame;
        }
        for channel in 0..C {
            frame[channel] = self.data[channel][i];
        }
        frame
    }

    pub fn sub_frame(&self, i: f32) -> [f32; C] {
        let mut frame = [0.; C];

        if i > (self.len - 1) as f32 {
            return frame;
        }

        let left_i = (i.floor() as usize).max(0);
        let right_i = (i.ceil() as usize).min(self.len - 1);

        for channel in 0..C {
            frame[channel] = lerp(
                self.data[channel][left_i],
                self.data[channel][right_i],
                i.fract(),
            );
        }

        frame
    }

    pub fn write_frame(&mut self, i: usize, frame: &[f32; C]) {
        for (dst_channel, src_sample) in self.data.iter_mut().zip(frame.iter()) {
            dst_channel[i] = *src_sample;
        }
    }

    pub fn append_frame(&mut self, i: usize, frame: &[f32; C]) {
        for (dst_channel, src_sample) in self.data.iter_mut().zip(frame.iter()) {
            dst_channel[i] += *src_sample;
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

fn lerp(a: f32, b: f32, t: f32) -> f32 {
    (1. - t) * a + t * b
}
